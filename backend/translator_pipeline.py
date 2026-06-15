#!/usr/bin/env python3
import base64
import csv
import html
import http.client
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Dict, List, Optional, Tuple


ROOT_DIR = Path(__file__).resolve().parent
PANDOC_DEFAULTS = ROOT_DIR / "pandoc" / "defaults.yaml"
MAX_RETRIES = 2
SEGMENT_CHAR_LIMIT = 5200
MINERU_POLL_INTERVAL_SECONDS = 2
MINERU_POLL_TIMEOUT_SECONDS = 900
GLOSSARY_MAX_TERMS = 40
GLOSSARY_CANDIDATE_LIMIT = 80
GLOSSARY_CONTEXT_SEGMENTS = 4
GLOSSARY_CONTEXT_CHAR_LIMIT = 12000
GLOSSARY_STOP_TERMS = {
    "paper",
    "papers",
    "method",
    "methods",
    "result",
    "results",
    "experiment",
    "experiments",
    "model",
    "models",
    "task",
    "tasks",
    "approach",
    "approaches",
    "system",
    "systems",
    "data",
    "analysis",
    "study",
    "studies",
}

runtime_site_packages = os.environ.get("PDF2ZH_RUNTIME_SITE_PACKAGES", "").strip()
if runtime_site_packages and Path(runtime_site_packages).exists():
    sys.path.insert(0, runtime_site_packages)

MINERU_DEBUG_LOG_PATH: Optional[Path] = None

for stream_name in ("stdout", "stderr"):
    stream = getattr(sys, stream_name, None)
    if stream and hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8", errors="replace")


def emit(event_type: str, stage: str, progress: int, message: str, **extra: object) -> None:
    payload = {
        "type": event_type,
        "stage": stage,
        "progress": progress,
        "message": message,
    }
    payload.update(extra)
    print(json.dumps(payload, ensure_ascii=False), flush=True)


def fail(message: str, report: Optional[dict] = None) -> None:
    payload = {"report": report} if report else {}
    emit("error", "failed", 0, message, **payload)
    raise SystemExit(1)


def read_payload() -> dict:
    raw = sys.stdin.read()
    if not raw.strip():
        fail("No task payload received by Python pipeline.")

    try:
        return json.loads(raw)
    except json.JSONDecodeError as error:
        fail(f"Invalid task payload JSON: {error}")


def read_service_test_payload() -> dict:
    raw = sys.stdin.read()
    if not raw.strip():
        raise RuntimeError("No settings payload received for service test.")

    try:
        return json.loads(raw)
    except json.JSONDecodeError as error:
        raise RuntimeError(f"Invalid service test payload JSON: {error}")


def ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def set_mineru_debug_log(path: Path) -> None:
    global MINERU_DEBUG_LOG_PATH
    MINERU_DEBUG_LOG_PATH = path
    ensure_dir(path.parent)
    path.write_text("", encoding="utf-8")


def append_mineru_log(message: str) -> None:
    if MINERU_DEBUG_LOG_PATH is None:
        return

    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    with MINERU_DEBUG_LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(f"[{timestamp}] {message}\n")


def summarize_json_shape(value: object, max_items: int = 8) -> str:
    if isinstance(value, dict):
        keys = list(value.keys())
        preview = ", ".join(str(key) for key in keys[:max_items])
        suffix = " ..." if len(keys) > max_items else ""
        return f"dict keys=[{preview}]{suffix}"
    if isinstance(value, list):
        return f"list len={len(value)}"
    if isinstance(value, str):
        compact = value.replace("\n", " ").strip()
        if len(compact) > 120:
            compact = f"{compact[:120]}..."
        return f"str {compact!r}"
    return repr(value)


def read_user_glossary(path: Optional[str]) -> Dict[str, str]:
    if not path:
        return {}

    glossary_path = Path(path)
    if not glossary_path.exists():
        return {}

    glossary: Dict[str, str] = {}
    suffix = glossary_path.suffix.lower()

    try:
        if suffix in {".csv", ".tsv"}:
            delimiter = "\t" if suffix == ".tsv" else ","
            with glossary_path.open("r", encoding="utf-8-sig", newline="") as handle:
                for row in csv.reader(handle, delimiter=delimiter):
                    if len(row) >= 2 and row[0].strip() and row[1].strip():
                        glossary[row[0].strip()] = row[1].strip()
        else:
            with glossary_path.open("r", encoding="utf-8-sig") as handle:
                for line in handle:
                    stripped = line.strip()
                    if not stripped or stripped.startswith("#"):
                        continue
                    for separator in ("\t", "=>", ":", "="):
                        if separator in stripped:
                            source, target = stripped.split(separator, 1)
                            if source.strip() and target.strip():
                                glossary[source.strip()] = target.strip()
                            break
    except OSError:
        return {}

    return glossary


def write_glossary_tsv(path: Path, glossary: Dict[str, str]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, delimiter="\t")
        writer.writerow(["source", "target"])
        for source, target in sorted(glossary.items()):
            writer.writerow([source, target])


def http_json_request(url: str, payload: dict, headers: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", **headers},
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=180) as response:
        raw = response.read().decode("utf-8")
        return json.loads(raw)


def http_post_json_request(url: str, payload: dict, headers: dict, timeout: int = 180) -> dict:
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "Accept": "*/*", **headers},
        method="POST",
    )
    append_mineru_log(f"HTTP POST {url} json={summarize_json_shape(payload)}")

    with urllib.request.urlopen(request, timeout=timeout) as response:
        raw = response.read().decode("utf-8")
        status = getattr(response, "status", 200)
        append_mineru_log(f"HTTP POST {url} -> {status}, body {len(raw)} chars")
        return json.loads(raw)


def http_get_json_request(url: str, headers: dict) -> dict:
    request = urllib.request.Request(url, headers=headers, method="GET")
    append_mineru_log(f"HTTP GET {url}")

    with urllib.request.urlopen(request, timeout=180) as response:
        raw = response.read().decode("utf-8")
        status = getattr(response, "status", 200)
        append_mineru_log(f"HTTP GET {url} -> {status}, body {len(raw)} chars")
        return json.loads(raw)


def http_put_file_request(url: str, file_path: Path, headers: dict, timeout: int = 600) -> int:
    parsed = urllib.parse.urlsplit(url)
    connection_class = http.client.HTTPSConnection if parsed.scheme == "https" else http.client.HTTPConnection
    connection = connection_class(parsed.netloc, timeout=timeout)
    target = parsed.path or "/"
    if parsed.query:
        target = f"{target}?{parsed.query}"
    body = file_path.read_bytes()
    request_headers = {
        "Content-Length": str(len(body)),
        **headers,
    }
    append_mineru_log(f"HTTP PUT {url} file={file_path.name} size={file_path.stat().st_size} bytes")

    try:
        connection.request("PUT", target, body=body, headers=request_headers)
        response = connection.getresponse()
        status = response.status
        raw = response.read().decode("utf-8", errors="ignore")
        append_mineru_log(f"HTTP PUT {url} -> {status}")
        if status >= 400:
            raise urllib.error.HTTPError(url, status, raw or response.reason, response.headers, None)
        return status
    finally:
        connection.close()


def http_download_file(url: str, destination: Path, headers: dict, timeout: int = 300) -> Path:
    request = urllib.request.Request(url, headers=headers, method="GET")
    append_mineru_log(f"HTTP GET(download) {url}")

    with urllib.request.urlopen(request, timeout=timeout) as response:
        status = getattr(response, "status", 200)
        destination.write_bytes(response.read())
        append_mineru_log(
            f"HTTP GET(download) {url} -> {status}, saved {destination.name} bytes={destination.stat().st_size}"
        )
    return destination


def http_multipart_request(url: str, file_path: Path, headers: dict, fields: dict) -> dict:
    boundary = f"----PDF2ZHBoundary{int(time.time() * 1000)}"
    body = bytearray()

    for key, value in fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(
            f'Content-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode("utf-8")
        )

    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(
        (
            f'Content-Disposition: form-data; name="file"; filename="{file_path.name}"\r\n'
            "Content-Type: application/pdf\r\n\r\n"
        ).encode("utf-8")
    )
    body.extend(file_path.read_bytes())
    body.extend(f"\r\n--{boundary}--\r\n".encode("utf-8"))

    request = urllib.request.Request(
        url,
        data=bytes(body),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}", **headers},
        method="POST",
    )
    append_mineru_log(
        f"HTTP POST {url} file={file_path.name} size={file_path.stat().st_size} bytes fields={fields}"
    )

    with urllib.request.urlopen(request, timeout=600) as response:
        raw = response.read().decode("utf-8")
        status = getattr(response, "status", 200)
        append_mineru_log(f"HTTP POST {url} -> {status}, body {len(raw)} chars")
        return json.loads(raw)


def dig_value(data: dict, keys: List[str]) -> Optional[object]:
    current: object = data
    for key in keys:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
        if current is None:
            return None
    return current


def write_asset(path: Path, value: str) -> None:
    ensure_dir(path.parent)

    if value.startswith("http://") or value.startswith("https://"):
        with urllib.request.urlopen(value, timeout=120) as response:
            path.write_bytes(response.read())
        return

    try:
        path.write_bytes(base64.b64decode(value))
    except Exception:
        path.write_text(value, encoding="utf-8")


def normalize_mineru_response(response: dict, assets_dir: Path) -> Tuple[str, dict]:
    append_mineru_log(f"Normalize MinerU response: {summarize_json_shape(response)}")
    candidates = [
        ["markdown"],
        ["md"],
        ["content"],
        ["data", "markdown"],
        ["data", "md"],
        ["result", "markdown"],
        ["result", "md"],
    ]

    for candidate in candidates:
        value = dig_value(response, candidate)
        if isinstance(value, str) and value.strip():
            markdown = value
            break
    else:
        raise RuntimeError(
            "MinerU API response did not include Markdown. Set MINERU_API_URL to an endpoint that returns a markdown/md/content field."
        )

    assets_payload = (
        response.get("assets")
        or dig_value(response, ["data", "assets"])
        or dig_value(response, ["result", "assets"])
        or response.get("images")
        or dig_value(response, ["data", "images"])
        or dig_value(response, ["result", "images"])
    )
    asset_count = 0

    if isinstance(assets_payload, dict):
        for name, value in assets_payload.items():
            if isinstance(name, str) and isinstance(value, str):
                write_asset(assets_dir / name, value)
                asset_count += 1

    if isinstance(assets_payload, list):
        for index, entry in enumerate(assets_payload, start=1):
            if not isinstance(entry, dict):
                continue
            name = entry.get("name") or entry.get("filename") or f"asset-{index}.bin"
            value = entry.get("base64") or entry.get("content") or entry.get("url")
            if isinstance(name, str) and isinstance(value, str):
                write_asset(assets_dir / name, value)
                asset_count += 1

    return markdown, {"asset_count": asset_count}


def extract_task_id(response: dict) -> Optional[str]:
    candidates = [
        ["task_id"],
        ["taskId"],
        ["id"],
        ["data", "task_id"],
        ["data", "taskId"],
        ["data", "id"],
        ["result", "task_id"],
        ["result", "taskId"],
        ["result", "id"],
    ]

    for candidate in candidates:
        value = dig_value(response, candidate)
        if isinstance(value, str) and value.strip():
            return value

    return None


def extract_status(response: dict) -> Optional[str]:
    candidates = [
        ["status"],
        ["state"],
        ["data", "status"],
        ["data", "state"],
        ["result", "status"],
        ["result", "state"],
    ]

    for candidate in candidates:
        value = dig_value(response, candidate)
        if isinstance(value, str) and value.strip():
            return value.strip().lower()

    return None


def guess_task_urls(api_url: str, task_id: str) -> Tuple[str, str]:
    base = api_url.rstrip("/")

    if base.endswith("/tasks"):
        task_url = f"{base}/{task_id}"
    elif base.endswith("/file_parse"):
        task_url = f"{base.rsplit('/', 1)[0]}/tasks/{task_id}"
    else:
        task_url = f"{base}/tasks/{task_id}"

    return task_url, f"{task_url}/result"


def extract_task_urls(response: dict, api_url: str, task_id: str) -> Tuple[str, str]:
    direct_task_url = (
        response.get("task_url")
        or response.get("status_url")
        or dig_value(response, ["data", "task_url"])
        or dig_value(response, ["data", "status_url"])
        or dig_value(response, ["result", "task_url"])
        or dig_value(response, ["result", "status_url"])
    )
    direct_result_url = (
        response.get("result_url")
        or dig_value(response, ["data", "result_url"])
        or dig_value(response, ["result", "result_url"])
    )

    guessed_task_url, guessed_result_url = guess_task_urls(api_url, task_id)
    task_url = direct_task_url if isinstance(direct_task_url, str) and direct_task_url else guessed_task_url
    result_url = (
        direct_result_url if isinstance(direct_result_url, str) and direct_result_url else guessed_result_url
    )
    return task_url, result_url


def rewrite_mineru_asset_paths(markdown: str) -> str:
    def replace_markdown_link(match: re.Match[str]) -> str:
        label = match.group(1)
        target = match.group(2).strip()
        title = match.group(3) or ""

        if not target or target.startswith(("http://", "https://", "data:", "#", "assets/")):
            return match.group(0)
        if target.startswith("/"):
            return match.group(0)
        return f"{label}(assets/{target}{title})"

    rewritten = re.sub(r"(!?\[[^\]]*])\(([^)\s]+)([^)]*)\)", replace_markdown_link, markdown)
    rewritten = re.sub(
        r'(<img[^>]*\ssrc=")(?!https?://|data:|/|assets/)([^"]+)(")',
        r"\1assets/\2\3",
        rewritten,
        flags=re.IGNORECASE,
    )
    return rewritten


def flatten_mineru_text_fragments(value: object) -> str:
    if isinstance(value, str):
        return value.strip()

    if isinstance(value, list):
        parts = [flatten_mineru_text_fragments(entry) for entry in value]
        normalized = [part for part in parts if part]
        return " ".join(normalized).strip()

    if isinstance(value, dict):
        content = value.get("content")
        if isinstance(content, str):
            return content.strip()
        if content is not None:
            return flatten_mineru_text_fragments(content)

    return ""


def collect_mineru_block_lines(value: object) -> List[str]:
    if isinstance(value, str):
        stripped = value.strip()
        return [stripped] if stripped else []

    if isinstance(value, list):
        lines: List[str] = []
        for entry in value:
            lines.extend(collect_mineru_block_lines(entry))
        return lines

    if isinstance(value, dict):
        content = value.get("content")
        if content is not None:
            return collect_mineru_block_lines(content)

    return []


def markdown_image_from_path(path_value: str, alt_text: str = "") -> str:
    normalized = path_value.strip()
    if not normalized:
        return ""
    return f"![{alt_text}](assets/{normalized})"


def extract_image_path_from_content(content: object) -> str:
    if isinstance(content, dict):
        direct = content.get("path")
        if isinstance(direct, str) and direct.strip():
            return direct.strip()
        nested = content.get("image_source")
        if isinstance(nested, dict):
            path_value = nested.get("path")
            if isinstance(path_value, str) and path_value.strip():
                return path_value.strip()
    return ""


def strip_html_tags(value: str) -> str:
    normalized = re.sub(r"(?i)<br\s*/?>", "\n", value)
    normalized = re.sub(r"(?s)<[^>]+>", "", normalized)
    normalized = html.unescape(normalized)
    normalized = re.sub(r"\s*\n\s*", " ", normalized)
    return re.sub(r"\s+", " ", normalized).strip()


def escape_latex_text(value: str) -> str:
    escaped = value
    for source, target in (
        ("\\", r"\textbackslash{}"),
        ("&", r"\&"),
        ("%", r"\%"),
        ("$", r"\$"),
        ("#", r"\#"),
        ("_", r"\_"),
        ("{", r"\{"),
        ("}", r"\}"),
        ("~", r"\textasciitilde{}"),
        ("^", r"\textasciicircum{}"),
    ):
        escaped = escaped.replace(source, target)
    return escaped


def extract_table_cells(row_html: str) -> List[dict]:
    cell_matches = re.findall(r'(?is)<t([dh])\b([^>]*)>(.*?)</t[dh]>', row_html)
    cells: List[dict] = []
    for cell_type, attrs, content in cell_matches:
        rowspan_match = re.search(r'(?i)rowspan\s*=\s*["\']?(\d+)', attrs)
        colspan_match = re.search(r'(?i)colspan\s*=\s*["\']?(\d+)', attrs)
        cells.append(
            {
                "type": cell_type,
                "text": strip_html_tags(content),
                "rowspan": int(rowspan_match.group(1)) if rowspan_match else 1,
                "colspan": int(colspan_match.group(1)) if colspan_match else 1,
            }
        )
    return cells


def build_table_grid(table_html: str) -> Optional[List[List[dict]]]:
    row_matches = re.findall(r"(?is)<tr\b[^>]*>(.*?)</tr>", table_html)
    if not row_matches:
        return None

    grid: List[List[dict]] = []
    rowspan_map: dict[int, int] = {}

    for row_html in row_matches:
        row: List[dict] = []
        col = 0
        cells = extract_table_cells(row_html)

        def consume_rowspans_until(stop_col: Optional[int] = None) -> None:
            nonlocal col
            while rowspan_map.get(col, 0) > 0 and (stop_col is None or col < stop_col):
                row.append({"kind": "rowspan"})
                rowspan_map[col] -= 1
                if rowspan_map[col] <= 0:
                    del rowspan_map[col]
                col += 1

        for cell in cells:
            consume_rowspans_until()

            row.append({**cell, "kind": "cell"})
            for _ in range(cell["colspan"] - 1):
                row.append({"kind": "colspan"})

            if cell["rowspan"] > 1:
                for span_col in range(col, col + cell["colspan"]):
                    rowspan_map[span_col] = max(rowspan_map.get(span_col, 0), cell["rowspan"] - 1)
            col += cell["colspan"]

        if rowspan_map:
            final_col = max([col] + [index + 1 for index in rowspan_map])
            while col < final_col:
                if rowspan_map.get(col, 0) > 0:
                    row.append({"kind": "rowspan"})
                    rowspan_map[col] -= 1
                    if rowspan_map[col] <= 0:
                        del rowspan_map[col]
                else:
                    row.append({"kind": "blank"})
                col += 1

        grid.append(row)

    column_count = max((len(row) for row in grid), default=0)
    if column_count == 0:
        return None

    normalized: List[List[dict]] = []
    for row in grid:
        normalized.append(row + ([{"kind": "blank"}] * (column_count - len(row))))
    return normalized


def convert_html_table_to_latex(table_html: str) -> Optional[str]:
    grid = build_table_grid(table_html)
    if not grid:
        return None

    column_count = max(len(row) for row in grid)
    if column_count == 0:
        return None

    column_spec = "|".join(["l"] * column_count)
    lines = [
        r"\begin{table}[H]",
        r"\centering",
        r"\resizebox{\linewidth}{!}{%",
        rf"\begin{{tabular}}{{|{column_spec}|}}",
        r"\hline",
    ]

    for row in grid:
        cells: List[str] = []
        col = 0
        while col < column_count:
            cell = row[col]
            if cell["kind"] in {"rowspan", "blank"}:
                cells.append("")
                col += 1
                continue
            if cell["kind"] == "colspan":
                col += 1
                continue

            text = escape_latex_text(cell["text"])
            if cell["rowspan"] > 1 and cell["colspan"] > 1:
                text = rf"\multirow{{{cell['rowspan']}}}{{*}}{{\multicolumn{{{cell['colspan']}}}{{|l|}}{{{text}}}}}"
            elif cell["rowspan"] > 1:
                text = rf"\multirow{{{cell['rowspan']}}}{{*}}{{{text}}}"
            elif cell["colspan"] > 1:
                text = rf"\multicolumn{{{cell['colspan']}}}{{|l|}}{{{text}}}"

            cells.append(text)
            col += cell["colspan"]

        lines.append(" & ".join(cells) + r" \\ \hline")

    lines.extend([
        r"\end{tabular}%",
        r"}",
        r"\end{table}",
    ])
    return "\n".join(lines)


def convert_html_table_to_markdown(table_html: str) -> Optional[str]:
    if re.search(r"(?i)\b(?:rowspan|colspan)\s*=", table_html):
        return None

    row_matches = re.findall(r"(?is)<tr\b[^>]*>(.*?)</tr>", table_html)
    if not row_matches:
        return None

    rows: List[List[str]] = []
    for row_html in row_matches:
        cell_matches = re.findall(r"(?is)<t[dh]\b[^>]*>(.*?)</t[dh]>", row_html)
        if not cell_matches:
            continue
        row = [strip_html_tags(cell).replace("|", r"\|") for cell in cell_matches]
        rows.append(row)

    if len(rows) < 2:
        return None

    column_count = max(len(row) for row in rows)
    if column_count == 0:
        return None

    normalized_rows = [row + [""] * (column_count - len(row)) for row in rows]
    header = normalized_rows[0]
    body = normalized_rows[1:]
    separator = ["---"] * column_count

    def format_row(row: List[str]) -> str:
        return "| " + " | ".join(cell.strip() for cell in row) + " |"

    return "\n".join([format_row(header), format_row(separator)] + [format_row(row) for row in body]).strip()


def render_mineru_structured_block(item: dict) -> str:
    item_type = str(item.get("type") or "").strip()

    if item_type == "equation":
        value = item.get("text")
        return value.strip() if isinstance(value, str) else ""

    if item_type == "table":
        caption = flatten_mineru_text_fragments(item.get("table_caption"))
        body = item.get("table_body")
        if not isinstance(body, str) or not body.strip():
            body = dig_value(item, ["content", "html"])
        footnote = flatten_mineru_text_fragments(item.get("table_footnote"))
        image_path = str(item.get("img_path") or "").strip()
        if not image_path:
            image_path = extract_image_path_from_content(item.get("content"))

        parts: List[str] = []
        if caption:
            parts.append(caption)
        rendered_table = convert_html_table_to_markdown(body) if isinstance(body, str) and body.strip() else None
        latex_table = None
        if not rendered_table and isinstance(body, str) and body.strip():
            latex_table = convert_html_table_to_latex(body)
        if rendered_table:
            parts.append(rendered_table)
        elif latex_table:
            parts.append(latex_table)
        elif image_path:
            parts.append(markdown_image_from_path(image_path, caption or "table"))
        elif isinstance(body, str) and body.strip():
            parts.append(body.strip())
        if footnote:
            parts.append(footnote)
        elif image_path and not rendered_table and not latex_table:
            parts.append(markdown_image_from_path(image_path, caption or "table"))
        return "\n\n".join(part for part in parts if part).strip()

    if item_type in {"image", "chart"}:
        caption_key = "image_caption" if item_type == "image" else "chart_caption"
        footnote_key = "image_footnote" if item_type == "image" else "chart_footnote"
        caption = flatten_mineru_text_fragments(item.get(caption_key))
        content = flatten_mineru_text_fragments(item.get("content"))
        footnote = flatten_mineru_text_fragments(item.get(footnote_key))
        image_path = str(item.get("img_path") or "").strip()
        if not image_path:
            image_path = extract_image_path_from_content(item.get("content"))

        parts: List[str] = []
        if caption:
            parts.append(caption)
        if image_path:
            parts.append(markdown_image_from_path(image_path, caption or item_type))
        if content:
            parts.append(content)
        if footnote:
            parts.append(footnote)
        return "\n\n".join(part for part in parts if part).strip()

    if item_type in {"paragraph", "title"}:
        field_name = "title_content" if item_type == "title" else "paragraph_content"
        lines = collect_mineru_block_lines(dig_value(item, ["content", field_name]))
        text = "\n".join(line for line in lines if line).strip()
        if item_type == "title" and text:
            level = dig_value(item, ["content", "level"])
            heading_level = level if isinstance(level, int) and level > 0 else 1
            heading_level = max(1, min(heading_level, 6))
            return f"{'#' * heading_level} {text}"
        return text

    if item_type in {"equation_inline", "equation_interline"}:
        math_content = dig_value(item, ["content", "math_content"])
        if isinstance(math_content, str) and math_content.strip():
            if item_type == "equation_interline":
                return f"$$\n{math_content.strip()}\n$$"
            return f"${math_content.strip()}$"

    return ""


def extract_text_from_content_item(item: dict) -> str:
    item_type = str(item.get("type") or "").strip()

    if item_type == "text":
        value = item.get("text")
        return value.strip() if isinstance(value, str) else ""

    if item_type == "list":
        values = item.get("list_items")
        if isinstance(values, list):
            parts = [entry.strip() for entry in values if isinstance(entry, str) and entry.strip()]
            return "\n".join(parts)
        return ""

    if item_type == "page_footnote":
        value = item.get("text")
        return value.strip() if isinstance(value, str) else ""

    return render_mineru_structured_block(item)


def is_numbered_footnote_list(item: dict) -> bool:
    if str(item.get("type") or "").strip() != "list":
        return False

    values = item.get("list_items")
    if not isinstance(values, list) or not values:
        return False

    normalized = [entry.strip() for entry in values if isinstance(entry, str) and entry.strip()]
    if not normalized:
        return False

    return all(re.match(r"^\d+\.\s", entry) for entry in normalized)


def normalize_inline_footnote_markers(text: str) -> str:
    return re.sub(r"([A-Za-z])(\d{1,2})(?=$|[\s,.;:)\]])", r"\1^\2", text)


def format_list_as_markdown(item: dict) -> str:
    values = item.get("list_items")
    if not isinstance(values, list):
        return ""

    normalized = [entry.strip() for entry in values if isinstance(entry, str) and entry.strip()]
    if not normalized:
        return ""

    if all(re.match(r"^\d+[.)]\s+", entry) for entry in normalized):
        return "\n".join(re.sub(r"^(\d+)[.)]\s+", r"\1. ", entry) for entry in normalized)

    if all(re.match(r"^[-*+•]\s+", entry) for entry in normalized):
        return "\n".join(re.sub(r"^[-*+•]\s+", "- ", entry) for entry in normalized)

    return "\n".join(f"- {entry}" for entry in normalized)


def format_content_item_as_markdown(item: dict, text: str) -> str:
    item_type = str(item.get("type") or "").strip()
    if item_type == "list":
        return format_list_as_markdown(item)

    text_level = item.get("text_level")
    if isinstance(text_level, int) and text_level > 0:
        heading_level = max(1, min(text_level, 6))
        return f"{'#' * heading_level} {text}"

    return text


def is_markdown_heading(block: str) -> bool:
    return bool(re.match(r"^#{1,6}\s+", block))


def is_markdown_list(block: str) -> bool:
    return bool(re.match(r"^(?:[-*+]\s+|\d+\.\s+)", block))


def is_markdown_blockquote(block: str) -> bool:
    return bool(re.match(r"^>\s?", block))


def is_plain_markdown_paragraph(block: str) -> bool:
    if not block or is_markdown_heading(block) or is_markdown_list(block) or is_markdown_blockquote(block):
        return False
    if block.startswith("<table") or block.startswith("![") or block.startswith("$$"):
        return False
    return True


def should_normalize_footnote_markers(item_type: str) -> bool:
    return item_type in {"text", "list", "page_footnote", "paragraph", "title"}


def format_as_blockquote(block: str) -> str:
    return "\n".join(f"> {line}" if line.strip() else ">" for line in block.splitlines())


def should_promote_to_blockquote(previous_block: str, current_block: str) -> bool:
    if not is_plain_markdown_paragraph(previous_block) or not is_plain_markdown_paragraph(current_block):
        return False

    if not re.search(r"[:：]\s*$", previous_block):
        return False

    current = current_block.lstrip()
    return bool(current) and bool(re.match(r'^[A-Z"“‘\[]', current))


def should_merge_with_previous(previous_block: str, current_block: str) -> bool:
    if not is_plain_markdown_paragraph(previous_block) or not is_plain_markdown_paragraph(current_block):
        return False

    if re.search(r"[:：]\s*$", previous_block):
        return False

    previous = previous_block.rstrip()
    current = current_block.lstrip()

    if previous.endswith("-") and re.match(r"^[a-z]", current):
        return True

    if re.search(r"[.!?。！？]$", previous):
        return False

    return bool(re.match(r'^[a-z(“"‘\[]', current))


def merge_markdown_blocks(blocks: List[str]) -> List[str]:
    merged: List[str] = []

    for raw_block in blocks:
        block = raw_block.strip()
        if not block:
            continue

        if merged and should_promote_to_blockquote(merged[-1], block):
            block = format_as_blockquote(block)

        if merged and should_merge_with_previous(merged[-1], block):
            previous = merged[-1].rstrip()
            current = block.lstrip()

            if previous.endswith("-") and re.match(r"^[a-z]", current):
                merged[-1] = f"{previous[:-1]}{current}"
            else:
                merged[-1] = f"{previous} {current}"
            continue

        merged.append(block)

    return merged


def rebuild_markdown_from_content_list(extracted_dir: Path) -> Optional[str]:
    content_list_candidates = sorted(extracted_dir.rglob("*_content_list.json"))
    if not content_list_candidates:
        append_mineru_log("No content_list.json found in MinerU zip; falling back to full.md")
        return None

    content_list_path = content_list_candidates[0]
    append_mineru_log(f"Rebuilding markdown from {content_list_path.relative_to(extracted_dir)}")

    try:
        data = json.loads(content_list_path.read_text(encoding="utf-8"))
    except Exception as error:
        append_mineru_log(f"Failed to parse content_list.json: {error}")
        return None

    if not isinstance(data, list):
        append_mineru_log(f"content_list.json has unexpected shape: {summarize_json_shape(data)}")
        return None

    body_parts: List[str] = []
    footnote_parts: List[str] = []

    for item in data:
        if not isinstance(item, dict):
            continue

        item_type = str(item.get("type") or "").strip()
        if item_type in {"header", "footer", "page_number"}:
            continue

        text = extract_text_from_content_item(item)
        if not text:
            continue
        if should_normalize_footnote_markers(item_type):
            text = normalize_inline_footnote_markers(text)

        if item_type == "page_footnote" or is_numbered_footnote_list(item):
            footnote_parts.append(text)
        else:
            body_parts.append(format_content_item_as_markdown(item, text))

    if not body_parts:
        append_mineru_log("content_list.json did not yield body text; falling back to full.md")
        return None

    body_parts = merge_markdown_blocks(body_parts)
    markdown = "\n\n".join(body_parts).strip()
    if footnote_parts:
        markdown = f"{markdown}\n\n## Footnotes\n\n" + "\n\n".join(footnote_parts).strip()

    append_mineru_log(
        f"Rebuilt markdown from content_list: body_blocks={len(body_parts)}, footnotes={len(footnote_parts)}"
    )
    return rewrite_mineru_asset_paths(markdown)


def extract_mineru_zip(zip_path: Path, work_dir: Path) -> Tuple[Path, dict]:
    extracted_dir = ensure_dir(work_dir / "mineru_zip")
    assets_dir = ensure_dir(work_dir / "assets")
    raw_md_path = work_dir / "raw.md"

    with zipfile.ZipFile(zip_path) as archive:
        archive.extractall(extracted_dir)

    markdown_candidate = extracted_dir / "full.md"
    if not markdown_candidate.exists():
        matches = list(extracted_dir.rglob("full.md"))
        if not matches:
            raise RuntimeError("MinerU 结果压缩包中没有找到 full.md。")
        markdown_candidate = matches[0]

    markdown = rebuild_markdown_from_content_list(extracted_dir)
    if markdown is None:
        markdown = rewrite_mineru_asset_paths(markdown_candidate.read_text(encoding="utf-8"))
    raw_md_path.write_text(markdown, encoding="utf-8")

    asset_count = 0
    for item in extracted_dir.rglob("*"):
        if not item.is_file():
            continue
        if item == markdown_candidate:
            continue

        relative = item.relative_to(extracted_dir)
        destination = assets_dir / relative
        ensure_dir(destination.parent)
        shutil.copy2(item, destination)
        asset_count += 1

    append_mineru_log(
        f"Extracted MinerU zip: markdown={markdown_candidate.relative_to(extracted_dir)}, asset_count={asset_count}"
    )
    return raw_md_path, {"asset_count": asset_count, "zip_path": str(zip_path)}


def guess_batch_result_url(api_url: str, batch_id: str) -> str:
    base = api_url.rstrip("/")
    if base.endswith("/file-urls/batch"):
        return f"{base.rsplit('/file-urls/batch', 1)[0]}/extract-results/batch/{batch_id}"
    return f"{base}/extract-results/batch/{batch_id}"


def extract_batch_result_entry(response: dict) -> dict:
    data = response.get("data")
    append_mineru_log(f"MinerU batch raw data shape: {summarize_json_shape(data)}")

    direct = dig_value(response, ["data", "extract_result"])
    append_mineru_log(f"MinerU batch extract_result shape: {summarize_json_shape(direct)}")
    if isinstance(direct, dict):
        return direct
    if isinstance(direct, list):
        for entry in direct:
            if isinstance(entry, dict):
                return entry

    candidates = dig_value(response, ["data", "extract_results"])
    if isinstance(candidates, list):
        for entry in candidates:
            if isinstance(entry, dict):
                return entry

    if isinstance(data, list):
        for entry in data:
            if isinstance(entry, dict):
                return entry

    if isinstance(data, dict):
        # Some responses flatten the single-file batch result directly under data.
        if any(key in data for key in ("state", "full_zip_url", "err_msg", "file_name")):
            return data

    raise RuntimeError(
        f"MinerU batch result format is unexpected: {summarize_json_shape(response)}"
    )


def poll_mineru_batch_result(result_url: str, headers: dict) -> dict:
    started = time.time()
    poll_count = 0
    last_status = None

    while True:
        if time.time() - started > MINERU_POLL_TIMEOUT_SECONDS:
            append_mineru_log(
                f"MinerU batch polling timed out after {poll_count} polls and {round(time.time() - started, 2)}s"
            )
            raise RuntimeError("MinerU batch polling timed out.")

        poll_count += 1
        response = http_get_json_request(result_url, headers)
        result = extract_batch_result_entry(response)

        status = str(result.get("state") or "").strip().lower()
        if status != last_status:
            append_mineru_log(f"MinerU batch status changed: {last_status} -> {status}")
            last_status = status

        if status == "done":
            return result
        if status == "failed":
            error_message = str(result.get("err_msg") or "未知错误").strip()
            raise RuntimeError(f"MinerU task failed: {error_message}")

        if poll_count == 1 or poll_count % 5 == 0:
            progress = result.get("extract_progress")
            append_mineru_log(
                f"MinerU batch still running: poll #{poll_count}, elapsed={round(time.time() - started, 2)}s, status={status}, progress={summarize_json_shape(progress)}"
            )

        time.sleep(MINERU_POLL_INTERVAL_SECONDS)


def poll_mineru_task(task_url: str, result_url: str, headers: dict, assets_dir: Path) -> Tuple[str, dict]:
    started = time.time()
    last_response = None
    poll_count = 0
    last_status = None

    while True:
        if time.time() - started > MINERU_POLL_TIMEOUT_SECONDS:
            append_mineru_log(
                f"MinerU polling timed out after {poll_count} polls and {round(time.time() - started, 2)}s"
            )
            raise RuntimeError("MinerU task polling timed out.")

        poll_count += 1
        response = http_get_json_request(task_url, headers)
        last_response = response

        try:
            append_mineru_log(f"MinerU task returned final markdown directly on poll #{poll_count}")
            return normalize_mineru_response(response, assets_dir)
        except RuntimeError:
            pass

        status = extract_status(response)
        if status != last_status:
            append_mineru_log(f"MinerU task status changed: {last_status} -> {status}")
            last_status = status
        if status in {"success", "succeeded", "completed", "done", "finished"}:
            append_mineru_log(f"MinerU task completed after {poll_count} polls, fetching result URL")
            break
        if status in {"failed", "error", "cancelled", "canceled"}:
            append_mineru_log(f"MinerU task failed with status={status} response={summarize_json_shape(response)}")
            raise RuntimeError(f"MinerU task failed with status: {status}")

        if poll_count == 1 or poll_count % 5 == 0:
            append_mineru_log(
                f"MinerU still running: poll #{poll_count}, elapsed={round(time.time() - started, 2)}s, status={status}"
            )

        time.sleep(MINERU_POLL_INTERVAL_SECONDS)

    try:
        result_response = http_get_json_request(result_url, headers)
        append_mineru_log(f"Fetched MinerU result URL after completion: {result_url}")
        return normalize_mineru_response(result_response, assets_dir)
    except Exception:
        if last_response is not None:
            append_mineru_log("Result URL fetch failed, falling back to last poll response")
            return normalize_mineru_response(last_response, assets_dir)
        raise


def extract_with_mineru(input_pdf: Path, work_dir: Path) -> Tuple[Path, dict]:
    api_url = os.environ.get("MINERU_API_URL", "").strip()
    api_key = os.environ.get("MINERU_API_KEY", "").strip()

    if not api_url:
        raise RuntimeError(
            "MINERU_API_URL is not configured. Please point it to the MinerU precise upload endpoint."
        )
    normalized = api_url.rstrip("/")
    if not normalized.endswith("/file-urls/batch"):
        raise RuntimeError(
            "MINERU_API_URL 必须填写 MinerU 精准解析本地上传接口，形如 `https://mineru.net/api/v4/file-urls/batch`。"
        )
    if not api_key:
        raise RuntimeError("MinerU precise upload API requires a token. Please fill in MinerU API Key.")

    headers = {"Authorization": f"Bearer {api_key}"}
    append_mineru_log("MinerU auth header enabled")

    append_mineru_log(f"Starting MinerU extraction for {input_pdf.name}")
    append_mineru_log(f"MinerU API URL: {api_url}")
    append_mineru_log(f"PDF absolute path: {input_pdf}")

    try:
        response = http_post_json_request(
            api_url,
            {
                "files": [
                    {
                        "name": input_pdf.name,
                        "data_id": input_pdf.stem[:128],
                    }
                ],
                "model_version": "vlm",
                "language": "en",
                "enable_table": True,
                "enable_formula": True,
                "is_ocr": False,
            },
            headers,
        )
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="ignore")
        append_mineru_log(f"MinerU create-upload HTTP error: {error.code} {detail}")
        raise RuntimeError(f"MinerU API request failed: {error.code} {detail}") from error
    except urllib.error.URLError as error:
        append_mineru_log(f"MinerU create-upload URL error: {error.reason}")
        raise RuntimeError(f"MinerU API is unreachable: {error.reason}") from error

    append_mineru_log(f"MinerU upload-link response summary: {summarize_json_shape(response)}")
    batch_id = dig_value(response, ["data", "batch_id"])
    file_urls = dig_value(response, ["data", "file_urls"])
    if not isinstance(batch_id, str) or not batch_id.strip():
        raise RuntimeError("MinerU did not return batch_id for local upload.")
    if not isinstance(file_urls, list) or not file_urls or not isinstance(file_urls[0], str):
        raise RuntimeError("MinerU did not return a valid file upload URL.")

    upload_url = file_urls[0]
    result_url = guess_batch_result_url(api_url, batch_id)
    append_mineru_log(f"MinerU batch_id: {batch_id}")
    append_mineru_log(f"MinerU file upload URL: {upload_url}")
    append_mineru_log(f"MinerU batch result URL: {result_url}")

    try:
        http_put_file_request(upload_url, input_pdf, {})
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="ignore")
        append_mineru_log(f"MinerU signed upload HTTP error: {error.code} {detail}")
        raise RuntimeError(f"MinerU signed upload failed: {error.code} {detail}") from error
    except urllib.error.URLError as error:
        append_mineru_log(f"MinerU signed upload URL error: {error.reason}")
        raise RuntimeError(f"MinerU signed upload is unreachable: {error.reason}") from error

    result = poll_mineru_batch_result(result_url, headers)
    full_zip_url = str(result.get("full_zip_url") or "").strip()
    if not full_zip_url:
        raise RuntimeError("MinerU batch finished but did not return full_zip_url.")

    zip_path = work_dir / "mineru_result.zip"
    http_download_file(full_zip_url, zip_path, {})
    raw_md_path, assets_meta = extract_mineru_zip(zip_path, work_dir)
    meta = {
        "source": "mineru_precise_local_upload",
        "batch_id": batch_id,
        "result_url": result_url,
        "full_zip_url": full_zip_url,
        **assets_meta,
    }

    append_mineru_log(
        f"MinerU extraction finished: markdown_path={raw_md_path.name}, asset_count={meta.get('asset_count', 0)}"
    )
    return raw_md_path, meta


def protect_blocks(markdown: str) -> Tuple[str, Dict[str, str]]:
    placeholders: Dict[str, str] = {}
    index = 1

    def stash(value: str, label: str) -> str:
        nonlocal index
        token = f"[[[PDF2ZH_{label}_{index:04d}]]]"
        placeholders[token] = value
        index += 1
        return token

    def replace_pattern(pattern: str, text: str, label: str, flags: int = 0) -> str:
        regex = re.compile(pattern, flags)
        return regex.sub(lambda match: stash(match.group(0), label), text)

    markdown = re.sub(
        r"(?ims)^(#{1,6}\s*(references|bibliography)\s*\n[\s\S]*)$",
        lambda match: stash(match.group(0), "REFERENCES"),
        markdown,
        count=1,
    )
    markdown = replace_pattern(r"```[\s\S]*?```", markdown, "CODE", re.MULTILINE)
    markdown = replace_pattern(r"<table[\s\S]*?</table>", markdown, "TABLE", re.IGNORECASE)
    markdown = replace_pattern(r"\$\$[\s\S]*?\$\$", markdown, "BLOCK_MATH", re.MULTILINE)
    markdown = replace_pattern(r"!\[[^\]]*]\([^)]+\)", markdown, "IMAGE")
    markdown = replace_pattern(r"(?m)^\[\^[^\]]+]:.*(?:\n[ \t].*)*", markdown, "FOOTNOTE")
    markdown = replace_pattern(r"(?<!\\)\$(?!\$)(.+?)(?<!\\)\$", markdown, "INLINE_MATH")
    return markdown, placeholders


def restore_blocks(markdown: str, placeholders: Dict[str, str]) -> str:
    restored = markdown
    for token, value in placeholders.items():
        restored = restored.replace(token, value)
    return restored


def split_markdown(markdown: str, limit: int) -> List[str]:
    sections: List[str] = []
    current: List[str] = []

    for line in markdown.splitlines(keepends=True):
        if re.match(r"^#{1,3}\s+", line) and current:
            sections.append("".join(current).strip())
            current = [line]
        else:
            current.append(line)

    if current:
        sections.append("".join(current).strip())

    chunks: List[str] = []
    for section in sections:
        if len(section) <= limit:
            if section:
                chunks.append(section)
            continue

        parts = re.split(r"\n\s*\n", section)
        bucket = ""
        for part in parts:
            candidate = f"{bucket}\n\n{part}".strip() if bucket else part
            if bucket and len(candidate) > limit:
                chunks.append(bucket.strip())
                bucket = part
            else:
                bucket = candidate
        if bucket.strip():
            chunks.append(bucket.strip())

    return [chunk for chunk in chunks if chunk.strip()]


def title_and_abstract(markdown: str) -> Tuple[str, str]:
    lines = [line.strip() for line in markdown.splitlines() if line.strip()]
    title = lines[0].lstrip("# ").strip() if lines else "Untitled Paper"
    abstract_match = re.search(
        r"(?ims)^#{0,6}\s*abstract\s*$([\s\S]*?)(?:^#{1,6}\s+|\Z)",
        markdown,
    )
    abstract = abstract_match.group(1).strip()[:1200] if abstract_match else ""
    return title, abstract


def glossary_context_from_segments(segments: List[str]) -> str:
    sample = "\n\n".join(segments[:GLOSSARY_CONTEXT_SEGMENTS])
    sample = re.sub(r"\[\[\[PDF2ZH_[A-Z0-9_]+\]\]\]", " ", sample)
    sample = re.sub(r"\n{3,}", "\n\n", sample)
    return sample[:GLOSSARY_CONTEXT_CHAR_LIMIT].strip()


def normalize_candidate_term(term: str) -> str:
    cleaned = re.sub(r"\s+", " ", term.strip())
    cleaned = cleaned.strip(".,;:()[]{}\"'")
    return cleaned


def candidate_is_valid(term: str) -> bool:
    normalized = normalize_candidate_term(term)
    lowered = normalized.lower()
    if not normalized or len(normalized) < 3:
        return False
    if lowered in GLOSSARY_STOP_TERMS:
        return False
    if lowered.startswith("figure ") or lowered.startswith("table "):
        return False
    if normalized.count(" ") > 7:
        return False
    if not re.search(r"[A-Za-z]", normalized):
        return False
    return True


def import_optional_module(name: str):
    try:
        return __import__(name)
    except Exception:
        return None


def extract_pyate_candidates(text: str) -> List[dict]:
    spacy_module = import_optional_module("spacy")
    if spacy_module is None:
        return []

    pyate_term_extraction = import_optional_module("pyate.term_extraction")
    if pyate_term_extraction is None:
        return []

    try:
        nlp = spacy_module.blank("en")
        if "sentencizer" not in nlp.pipe_names:
            nlp.add_pipe("sentencizer")
        doc = nlp(text)
        pyate_term_extraction.TermExtractionPipeline()
        candidates = doc._.combo_basic.sort_values(ascending=False)[:GLOSSARY_CANDIDATE_LIMIT]
    except Exception:
        return []

    results: List[dict] = []
    for term, score in candidates.items():
        candidate = normalize_candidate_term(str(term))
        if candidate_is_valid(candidate):
            results.append(
                {
                    "source": candidate,
                    "score": float(score),
                    "source_engine": "pyate",
                }
            )
    return results


def extract_keybert_candidates(text: str) -> List[dict]:
    keybert_module = import_optional_module("keybert")
    if keybert_module is None:
        return []

    try:
        model = keybert_module.KeyBERT()
        keywords = model.extract_keywords(
            text,
            keyphrase_ngram_range=(1, 4),
            stop_words="english",
            top_n=GLOSSARY_CANDIDATE_LIMIT,
            use_maxsum=True,
            nr_candidates=min(GLOSSARY_CANDIDATE_LIMIT * 2, 160),
        )
    except Exception:
        return []

    results: List[dict] = []
    for term, score in keywords:
        candidate = normalize_candidate_term(str(term))
        if candidate_is_valid(candidate):
            results.append(
                {
                    "source": candidate,
                    "score": float(score),
                    "source_engine": "keybert",
                }
            )
    return results


def merge_candidate_lists(pyate_candidates: List[dict], keybert_candidates: List[dict]) -> List[dict]:
    merged: Dict[str, dict] = {}

    for item in pyate_candidates:
        key = item["source"].lower()
        merged[key] = {
            "source": item["source"],
            "pyate_score": item.get("score", 0.0),
            "keybert_score": 0.0,
            "engines": ["pyate"],
        }

    for item in keybert_candidates:
        key = item["source"].lower()
        if key in merged:
            merged[key]["keybert_score"] = item.get("score", 0.0)
            merged[key]["engines"].append("keybert")
        else:
            merged[key] = {
                "source": item["source"],
                "pyate_score": 0.0,
                "keybert_score": item.get("score", 0.0),
                "engines": ["keybert"],
            }

    def rank(entry: dict) -> Tuple[int, float]:
        engine_bonus = 2 if len(entry["engines"]) > 1 else 1
        combined_score = float(entry.get("pyate_score", 0.0)) + float(entry.get("keybert_score", 0.0))
        return engine_bonus, combined_score

    ranked = sorted(merged.values(), key=rank, reverse=True)
    return ranked[:GLOSSARY_CANDIDATE_LIMIT]


def candidate_terms_to_glossary(candidates: List[dict]) -> List[dict]:
    terms: List[dict] = []
    for item in candidates[:GLOSSARY_MAX_TERMS]:
        source = str(item.get("source", "")).strip()
        if not source:
            continue
        terms.append(
            {
                "source": source,
                "target": source,
                "kind": "candidate",
                "confidence": item.get("score", 0.0),
            }
        )
    return terms


def build_glossary_prompt(
    title: str,
    abstract: str,
    sample_context: str,
    existing_glossary: Dict[str, str],
    candidates: List[dict],
) -> Tuple[str, str]:
    system = (
        "You are an expert academic terminology curator for English-to-Simplified-Chinese translation. "
        "Build a high-value paper glossary for English-to-Simplified-Chinese translation. "
        "Prefer technical nouns, abbreviations, datasets, metrics, methods, model names, and recurring "
        "specialized concepts. Avoid generic academic phrases. Return strict JSON only."
    )
    user = json.dumps(
        {
            "paper_title": title,
            "paper_abstract": abstract,
            "sample_context": sample_context,
            "existing_glossary": existing_glossary,
            "candidate_terms": candidates,
            "requirements": [
                "Return at most 40 high-value glossary entries.",
                "Keep source terms in original English casing.",
                "Provide concise, standard Simplified Chinese translations suitable for academic papers.",
                "Do not include generic words like paper, method, result, experiment unless they are part of a named term.",
                "If a term already exists in existing_glossary, do not repeat it.",
                "When candidate_terms are provided, treat them as strong hints and filter, merge, deduplicate, and standardize them.",
                "Merge abbreviations and full names when appropriate, but keep the source field as the most useful lookup form.",
            ],
            "output_schema": {
                "terms": [
                    {
                        "source": "english term",
                        "target": "中文术语",
                        "kind": "acronym|method|dataset|metric|concept|entity",
                        "confidence": 0.0,
                    }
                ]
            },
        },
        ensure_ascii=False,
    )
    return system, user


def parse_glossary_response(raw_text: str) -> List[dict]:
    text = raw_text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.IGNORECASE | re.DOTALL).strip()

    parsed = None
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        json_match = re.search(r"\{[\s\S]*\}", text)
        if json_match:
            try:
                parsed = json.loads(json_match.group(0))
            except json.JSONDecodeError:
                parsed = None

    if not isinstance(parsed, dict):
        return []

    terms = parsed.get("terms")
    if not isinstance(terms, list):
        return []

    cleaned: List[dict] = []
    for item in terms:
        if not isinstance(item, dict):
            continue
        source = str(item.get("source", "")).strip()
        target = str(item.get("target", "")).strip()
        if not source or not target:
            continue
        cleaned.append(
            {
                "source": source,
                "target": target,
                "kind": str(item.get("kind", "")).strip(),
                "confidence": item.get("confidence"),
            }
        )

    return cleaned[:GLOSSARY_MAX_TERMS]


def build_translation_prompt(
    title: str,
    abstract: str,
    previous_context: str,
    glossary: Dict[str, str],
    content: str,
) -> Tuple[str, str]:
    system = (
        "You are an expert academic translator. Translate English academic Markdown into fluent, "
        "accurate Simplified Chinese. Keep structure, headings, placeholders, and inline markup "
        "exactly intact. Do not expand, summarize, omit, or explain. Never alter placeholders like "
        "[[[PDF2ZH_*]]]. Return strict JSON with keys translated_markdown and glossary_updates."
    )
    user = json.dumps(
        {
            "paper_title": title,
            "paper_abstract": abstract,
            "previous_context": previous_context,
            "glossary": glossary,
            "rules": [
                "Keep all Markdown structure and placeholders unchanged.",
                "Translate headings, body text, figure captions, and table captions.",
                "Do not translate bibliography entries inside protected placeholders.",
                "If you propose terminology updates, keep them short and academically standard.",
                "Return JSON only.",
            ],
            "content": content,
            "output_schema": {
                "translated_markdown": "string",
                "glossary_updates": [{"source": "english term", "target": "chinese term"}],
            },
        },
        ensure_ascii=False,
    )
    return system, user


def parse_model_response(raw_text: str) -> Tuple[str, List[dict]]:
    text = raw_text.strip()
    if text.startswith("```"):
      text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.IGNORECASE | re.DOTALL).strip()

    try:
        parsed = json.loads(text)
        translated = parsed.get("translated_markdown") or parsed.get("translation") or ""
        glossary_updates = parsed.get("glossary_updates") or []
        if isinstance(translated, str):
            return translated, glossary_updates if isinstance(glossary_updates, list) else []
    except json.JSONDecodeError:
        pass

    json_match = re.search(r"\{[\s\S]*\}", text)
    if json_match:
        try:
            parsed = json.loads(json_match.group(0))
            translated = parsed.get("translated_markdown") or ""
            glossary_updates = parsed.get("glossary_updates") or []
            if isinstance(translated, str):
                return translated, glossary_updates if isinstance(glossary_updates, list) else []
        except json.JSONDecodeError:
            pass

    return raw_text, []


def call_translation_model(provider: str, api_key: str, model: str, system: str, user: str) -> str:
    if provider == "openai":
        return call_openai(api_key, model, system, user)
    if provider == "claude":
        return call_claude(api_key, model, system, user)
    if provider == "deepseek":
        return call_deepseek(api_key, model, system, user)
    raise RuntimeError(f"Unsupported provider: {provider}")


def resolve_api_base_url(env_name: str, default_url: str) -> str:
    override = os.environ.get(env_name, "").strip()
    if override:
        return override.rstrip("/")
    return default_url.rstrip("/")


def extract_ai_glossary(
    provider: str,
    api_key: str,
    model: str,
    title: str,
    abstract: str,
    segments: List[str],
    existing_glossary: Dict[str, str],
    candidate_terms: List[dict],
) -> List[dict]:
    sample_context = glossary_context_from_segments(segments)
    if not sample_context and not abstract:
        return []

    system, user = build_glossary_prompt(title, abstract, sample_context, existing_glossary, candidate_terms)
    raw = call_translation_model(provider, api_key, model, system, user)
    return parse_glossary_response(raw)


def call_openai(api_key: str, model: str, system: str, user: str) -> str:
    endpoint = f"{resolve_api_base_url('PDF2ZH_OPENAI_BASE_URL', 'https://api.openai.com')}/v1/chat/completions"
    response = http_json_request(
        endpoint,
        {
            "model": model,
            "temperature": 0.2,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        },
        {"Authorization": f"Bearer {api_key}"},
    )

    choices = response.get("choices") or []
    if not choices:
        raise RuntimeError("OpenAI response did not contain any choices.")

    content = choices[0].get("message", {}).get("content")
    if isinstance(content, str):
        return content

    raise RuntimeError("OpenAI response did not contain textual content.")


def call_claude(api_key: str, model: str, system: str, user: str) -> str:
    endpoint = f"{resolve_api_base_url('PDF2ZH_ANTHROPIC_BASE_URL', 'https://api.anthropic.com')}/v1/messages"
    response = http_json_request(
        endpoint,
        {
            "model": model,
            "max_tokens": 4096,
            "temperature": 0.2,
            "system": system,
            "messages": [{"role": "user", "content": user}],
        },
        {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
    )

    content = response.get("content") or []
    if isinstance(content, list):
        text_parts = [entry.get("text", "") for entry in content if isinstance(entry, dict)]
        merged = "".join(part for part in text_parts if isinstance(part, str))
        if merged.strip():
            return merged

    raise RuntimeError("Claude response did not contain textual content.")


def call_deepseek(api_key: str, model: str, system: str, user: str) -> str:
    endpoint = f"{resolve_api_base_url('PDF2ZH_DEEPSEEK_BASE_URL', 'https://api.deepseek.com')}/chat/completions"
    response = http_json_request(
        endpoint,
        {
            "model": model,
            "temperature": 0.2,
            "stream": False,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        },
        {"Authorization": f"Bearer {api_key}"},
    )

    choices = response.get("choices") or []
    if not choices:
        raise RuntimeError("DeepSeek response did not contain any choices.")

    content = choices[0].get("message", {}).get("content")
    if isinstance(content, str):
        return content

    raise RuntimeError("DeepSeek response did not contain textual content.")


def test_llm_connection(payload: dict) -> str:
    provider = str(payload.get("provider") or "").strip()
    model = str(payload.get("model") or "").strip()
    api_key = str(payload.get("apiKey") or "").strip()

    if not provider:
        raise RuntimeError("请选择模型提供方。")
    if not model:
        raise RuntimeError("请填写模型名。")
    if not api_key:
        raise RuntimeError("请填写模型 API Key。")

    response = call_translation_model(
        provider,
        api_key,
        model,
        "You are a connection test assistant. Reply with exactly OK.",
        "Reply with exactly OK.",
    ).strip()

    if not response:
        raise RuntimeError("LLM API 返回成功，但响应内容为空。")

    preview = response.replace("\n", " ").strip()
    if len(preview) > 80:
        preview = f"{preview[:80]}..."

    return f"LLM API 连接成功，模型 {model} 可用。返回：{preview}"


def test_mineru_connection(payload: dict) -> str:
    api_url = str(payload.get("mineruApiUrl") or "").strip()
    api_key = str(payload.get("mineruApiKey") or "").strip()

    if not api_url:
        raise RuntimeError("请填写 MinerU API URL。")

    normalized = api_url.rstrip("/")
    if not normalized.endswith("/file-urls/batch"):
        raise RuntimeError(
            "当前 MinerU URL 不是本应用已适配的精准解析本地上传接口。请填写 `.../api/v4/file-urls/batch`。"
        )
    if not api_key:
        raise RuntimeError("精准解析 API 需要 Token，请填写 MinerU API Key。")

    headers = {"Authorization": f"Bearer {api_key}"}

    request = urllib.request.Request(api_url, headers=headers, method="OPTIONS")

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            status = getattr(response, "status", 200)
            return f"MinerU 服务可访问，接口返回 HTTP {status}。"
    except urllib.error.HTTPError as error:
        if error.code in {400, 401, 403, 404, 405}:
            return f"MinerU 服务可访问，接口返回 HTTP {error.code}。"
        detail = error.read().decode("utf-8", errors="ignore").strip()
        raise RuntimeError(f"MinerU 接口返回异常：HTTP {error.code} {detail}".strip())
    except urllib.error.URLError as error:
        raise RuntimeError(f"MinerU API 无法访问：{error.reason}") from error


def maybe_run_service_test() -> bool:
    test_kind = os.environ.get("PDF2ZH_SERVICE_TEST", "").strip()
    if not test_kind:
        return False

    payload = read_service_test_payload()

    try:
        if test_kind == "llm":
            print(test_llm_connection(payload), flush=True)
            return True
        if test_kind == "mineru":
            print(test_mineru_connection(payload), flush=True)
            return True
        raise RuntimeError(f"Unsupported service test kind: {test_kind}")
    except Exception as error:
        print(str(error), flush=True)
        raise SystemExit(1)


def translate_segment(
    provider: str,
    api_key: str,
    model: str,
    title: str,
    abstract: str,
    previous_context: str,
    glossary: Dict[str, str],
    content: str,
) -> Tuple[str, List[dict]]:
    system, user = build_translation_prompt(title, abstract, previous_context, glossary, content)
    raw = call_translation_model(provider, api_key, model, system, user)
    return parse_model_response(raw)


def merge_glossary(glossary: Dict[str, str], updates: List[dict]) -> None:
    for item in updates:
        if not isinstance(item, dict):
            continue
        source = str(item.get("source", "")).strip()
        target = str(item.get("target", "")).strip()
        if source and target and source not in glossary:
            glossary[source] = target


def merge_ai_glossary(glossary: Dict[str, str], ai_terms: List[dict]) -> int:
    added = 0
    for item in ai_terms:
        if not isinstance(item, dict):
            continue
        source = str(item.get("source", "")).strip()
        target = str(item.get("target", "")).strip()
        if source and target and source not in glossary:
            glossary[source] = target
            added += 1
    return added


def clamp_translation_concurrency(value: object) -> int:
    try:
        concurrency = int(value)
    except (TypeError, ValueError):
        concurrency = 3
    return max(2, min(4, concurrency))


def translate_segment_with_retries(
    index: int,
    segment: str,
    provider: str,
    api_key: str,
    model: str,
    title: str,
    abstract: str,
    previous_context: str,
    glossary_snapshot: Dict[str, str],
) -> dict:
    translated = None
    glossary_updates: List[dict] = []
    last_error = None
    retries = 0
    failed = False

    for attempt in range(MAX_RETRIES + 1):
        try:
            translated, glossary_updates = translate_segment(
                provider=provider,
                api_key=api_key,
                model=model,
                title=title,
                abstract=abstract,
                previous_context=previous_context,
                glossary=glossary_snapshot,
                content=segment,
            )
            break
        except Exception as error:
            last_error = str(error)
            retries += 1
            if attempt < MAX_RETRIES:
                time.sleep(1.2 * (attempt + 1))

    if translated is None:
        failed = True
        translated = segment

    return {
        "index": index,
        "translated": translated,
        "glossary_updates": glossary_updates,
        "error": last_error if failed else None,
        "retries": retries,
    }


def translate_segments_serial(
    segments: List[str],
    provider: str,
    api_key: str,
    model: str,
    title: str,
    abstract: str,
    glossary: Dict[str, str],
    report: dict,
    task_id: str,
) -> List[str]:
    translated_segments: List[str] = []
    previous_context = abstract[:900]

    for index, segment in enumerate(segments, start=1):
        segment_progress = 38 + int((index / max(len(segments), 1)) * 40)
        emit("status", "translating", segment_progress, f"正在翻译第 {index}/{len(segments)} 段。", taskId=task_id)

        translated = None
        last_error = None
        for attempt in range(MAX_RETRIES + 1):
            try:
                translated, glossary_updates = translate_segment(
                    provider=provider,
                    api_key=api_key,
                    model=model,
                    title=title,
                    abstract=abstract,
                    previous_context=previous_context[-1200:],
                    glossary=glossary,
                    content=segment,
                )
                merge_glossary(glossary, glossary_updates)
                break
            except Exception as error:
                last_error = str(error)
                report["retries"] += 1
                if attempt < MAX_RETRIES:
                    emit(
                        "status",
                        "translating",
                        segment_progress,
                        f"第 {index} 段翻译失败，正在重试 {attempt + 1}/{MAX_RETRIES}。",
                        taskId=task_id,
                    )
                    time.sleep(1.2 * (attempt + 1))

        if translated is None:
            report["failed_segments"].append({"index": index, "error": last_error})
            translated = segment

        translated_segments.append(translated)
        previous_context = f"{previous_context}\n\n{translated}"[-2400:]

    return translated_segments


def translate_segments_parallel(
    segments: List[str],
    provider: str,
    api_key: str,
    model: str,
    title: str,
    abstract: str,
    glossary: Dict[str, str],
    report: dict,
    task_id: str,
    concurrency: int,
) -> List[str]:
    translated_segments: List[Optional[str]] = [None] * len(segments)
    glossary_snapshot = dict(glossary)
    batch_size = max(1, concurrency)
    previous_context = abstract[:900]
    all_glossary_updates: List[dict] = []

    for batch_start in range(0, len(segments), batch_size):
        batch = list(enumerate(segments[batch_start : batch_start + batch_size], start=batch_start + 1))
        batch_context = previous_context[-1200:]
        emit(
            "status",
            "translating",
            38 + int(((batch_start + 1) / max(len(segments), 1)) * 40),
            f"正在并行翻译第 {batch_start + 1}-{batch[-1][0]} 段（并发 {batch_size}）。",
            taskId=task_id,
        )

        with ThreadPoolExecutor(max_workers=batch_size) as executor:
            futures = {
                executor.submit(
                    translate_segment_with_retries,
                    index,
                    segment,
                    provider,
                    api_key,
                    model,
                    title,
                    abstract,
                    batch_context,
                    glossary_snapshot,
                ): index
                for index, segment in batch
            }

            results = []
            for future in as_completed(futures):
                try:
                    results.append(future.result())
                except Exception as error:
                    index = futures[future]
                    results.append(
                        {
                            "index": index,
                            "translated": segments[index - 1],
                            "glossary_updates": [],
                            "error": str(error),
                            "retries": 0,
                        }
                    )

        for result in sorted(results, key=lambda item: item["index"]):
            index = result["index"]
            translated = result["translated"]
            if result["error"]:
                report["failed_segments"].append({"index": index, "error": result["error"]})
            report["retries"] += int(result["retries"])
            translated_segments[index - 1] = translated
            all_glossary_updates.extend(result["glossary_updates"])
            previous_context = f"{previous_context}\n\n{translated}"[-2400:]

    merge_glossary(glossary, all_glossary_updates)
    return [segment if segment is not None else "" for segment in translated_segments]


def resolve_runtime_binary(env_key: str, fallback_name: str) -> Optional[str]:
    explicit = os.environ.get(env_key, "").strip()
    if explicit and Path(explicit).exists():
        return explicit

    runtime_root = os.environ.get("PDF2ZH_RUNTIME_ROOT", "").strip()
    if runtime_root:
        for candidate in (
            Path(runtime_root) / "bin" / fallback_name,
            Path(runtime_root) / "bin" / f"{fallback_name}.exe",
        ):
            if candidate.exists():
                return str(candidate)

    return shutil.which(fallback_name)


def render_pdf(markdown_path: Path, output_pdf: Path) -> Optional[str]:
    pandoc_bin = resolve_runtime_binary("PDF2ZH_PANDOC", "pandoc")
    if not pandoc_bin:
        return "pandoc is not installed or not available in PATH."

    pdf_engine = resolve_runtime_binary("PDF2ZH_TECTONIC", "tectonic") or "tectonic"

    command = [
        pandoc_bin,
        str(markdown_path),
        "--defaults",
        str(PANDOC_DEFAULTS),
        f"--pdf-engine={pdf_engine}",
        "--output",
        str(output_pdf),
    ]

    try:
        subprocess.run(
            command,
            cwd=str(markdown_path.parent),
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
    except subprocess.CalledProcessError as error:
        details = error.stderr.strip() or error.stdout.strip()
        return details or "Pandoc failed to render PDF."

    return None


def rerender_existing_pdf(payload: dict) -> None:
    task_id = str(payload.get("taskId") or f"task-{int(time.time())}")
    output_dir = ensure_dir(Path(payload["outputDir"]).expanduser())
    translated_md_path = output_dir / "translated.md"
    translated_pdf_path = output_dir / "translated.pdf"
    report_path = output_dir / "translation_report.json"

    if not translated_md_path.exists():
        fail(f"Translated markdown does not exist: {translated_md_path}")

    emit("status", "rendering_pdf", 90, "正在检查已翻译的 Markdown。", taskId=task_id, outputDir=str(output_dir))
    emit("status", "rendering_pdf", 93, "正在调用 Pandoc 和 Tectonic 生成 PDF，这一步首次通常会比较慢。", taskId=task_id, outputDir=str(output_dir))
    start = time.time()
    pdf_error = render_pdf(translated_md_path, translated_pdf_path)
    duration = round(time.time() - start, 2)

    report = {
        "task_id": task_id,
        "mode": "rerender_pdf",
        "output_dir": str(output_dir),
        "translated_md": str(translated_md_path),
        "translated_pdf": str(translated_pdf_path),
        "started_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "stages": {"rendering_pdf": duration},
        "pdf_generated": pdf_error is None and translated_pdf_path.exists(),
    }
    if pdf_error:
        report["pdf_error"] = pdf_error

    write_report(report_path, report)

    if pdf_error:
        fail(pdf_error, report)

    emit(
        "result",
        "completed",
        100,
        "PDF 已重新生成完成。",
        taskId=task_id,
        outputDir=str(output_dir),
        translatedMd=str(translated_md_path),
        translatedPdf=str(translated_pdf_path),
        reportPath=str(report_path),
    )


def write_report(report_path: Path, report: dict) -> None:
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    payload = read_payload()
    if payload.get("mode") == "rerender_pdf":
        rerender_existing_pdf(payload)
        return

    task_id = payload.get("taskId", f"task-{int(time.time())}")
    enable_translation = bool(payload.get("enableTranslation", True))
    input_pdf = Path(payload["inputPdf"]).expanduser().resolve()
    os.environ["MINERU_API_URL"] = str(payload.get("mineruApiUrl", os.environ.get("MINERU_API_URL", "")))
    if payload.get("mineruApiKey"):
        os.environ["MINERU_API_KEY"] = str(payload["mineruApiKey"])
    output_dir = ensure_dir(Path(payload["outputDir"]).expanduser())
    work_dir = ensure_dir(output_dir / ".work")
    raw_output_path = output_dir / "raw.md"
    translated_md_path = output_dir / "translated.md"
    translated_pdf_path = output_dir / "translated.pdf"
    report_path = output_dir / "translation_report.json"
    mineru_log_path = output_dir / "mineru_debug.log"
    glossary_output_path = output_dir / "glossary.tsv"
    output_assets_dir = ensure_dir(output_dir / "assets")
    set_mineru_debug_log(mineru_log_path)

    report = {
        "task_id": task_id,
        "input_file": str(input_pdf),
        "provider": payload.get("provider"),
        "model": payload.get("model"),
        "started_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "enable_translation": enable_translation,
        "stages": {},
        "retries": 0,
        "failed_segments": [],
        "pdf_generated": False,
        "mineru_log_path": str(mineru_log_path),
    }

    if not input_pdf.exists():
        fail(f"Input PDF does not exist: {input_pdf}", report)

    emit("status", "extracting", 8, "正在调用 MinerU 提取 Markdown 和资源。", taskId=task_id)
    start = time.time()
    append_mineru_log("Translation task entered MinerU extraction stage")

    try:
        raw_md_path, mineru_meta = extract_with_mineru(input_pdf, work_dir)
    except Exception as error:
        report["stages"]["extracting"] = round(time.time() - start, 2)
        append_mineru_log(f"MinerU extraction failed: {error}")
        fail(str(error), report)

    report["stages"]["extracting"] = round(time.time() - start, 2)
    report["mineru_meta"] = mineru_meta

    extracted_assets_dir = work_dir / "assets"
    if extracted_assets_dir.exists():
        for item in extracted_assets_dir.rglob("*"):
            if item.is_file():
                destination = output_assets_dir / item.relative_to(extracted_assets_dir)
                ensure_dir(destination.parent)
                shutil.copy2(item, destination)

    raw_markdown = raw_md_path.read_text(encoding="utf-8")
    raw_output_path.write_text(raw_markdown, encoding="utf-8")

    if not enable_translation:
        write_report(report_path, report)
        emit(
            "result",
            "completed",
            100,
            "MinerU 提取完成，已导出 raw.md。",
            taskId=task_id,
            outputDir=str(output_dir),
            rawMd=str(raw_output_path),
            translatedMd=None,
            translatedPdf=None,
            reportPath=str(report_path),
            retriedSegments=0,
        )
        return

    emit("status", "preprocessing", 24, "正在保护图片、公式、表格与参考文献结构。", taskId=task_id)
    start = time.time()
    protected_markdown, placeholders = protect_blocks(raw_markdown)
    title, abstract = title_and_abstract(protected_markdown)
    segments = split_markdown(protected_markdown, SEGMENT_CHAR_LIMIT)
    glossary = read_user_glossary(payload.get("glossaryPath"))
    glossary_strategy = str(payload.get("glossaryStrategy") or "hybrid").strip() or "hybrid"
    glossary_model = str(payload.get("glossaryModel") or payload.get("model") or "").strip()
    glossary_provider = str(payload.get("provider") or "").strip()
    glossary_context = glossary_context_from_segments(segments)
    report["segment_count"] = len(segments)
    report["initial_glossary_size"] = len(glossary)
    report["user_glossary_size"] = len(glossary)
    report["glossary_strategy"] = glossary_strategy
    report["glossary_model"] = glossary_model
    report["glossary_provider"] = glossary_provider

    emit("status", "preprocessing", 30, "正在预处理术语表，提取高价值学术术语。", taskId=task_id)
    ai_glossary_terms: List[dict] = []
    glossary_candidates: List[dict] = []
    ai_glossary_error = None

    pyate_candidates = extract_pyate_candidates(glossary_context) if glossary_strategy in {"hybrid", "pyate_only"} else []
    keybert_candidates = (
        extract_keybert_candidates(glossary_context) if glossary_strategy in {"hybrid", "keybert_only"} else []
    )

    if glossary_strategy == "hybrid":
        glossary_candidates = merge_candidate_lists(pyate_candidates, keybert_candidates)
    elif glossary_strategy == "pyate_only":
        glossary_candidates = pyate_candidates[:GLOSSARY_CANDIDATE_LIMIT]
    elif glossary_strategy == "keybert_only":
        glossary_candidates = keybert_candidates[:GLOSSARY_CANDIDATE_LIMIT]

    report["pyate_candidate_count"] = len(pyate_candidates)
    report["keybert_candidate_count"] = len(keybert_candidates)
    report["glossary_candidate_count"] = len(glossary_candidates)

    if glossary_strategy in {"hybrid", "llm_only"}:
        try:
            ai_glossary_terms = extract_ai_glossary(
                provider=glossary_provider,
                api_key=str(payload["apiKey"]),
                model=glossary_model,
                title=title,
                abstract=abstract,
                segments=segments,
                existing_glossary=glossary,
                candidate_terms=glossary_candidates,
            )
        except Exception as error:
            ai_glossary_error = str(error)
    else:
        ai_glossary_terms = candidate_terms_to_glossary(glossary_candidates)

    ai_glossary_count = merge_ai_glossary(glossary, ai_glossary_terms)
    report["ai_glossary_candidates"] = len(ai_glossary_terms)
    report["ai_glossary_count"] = ai_glossary_count
    report["glossary_output"] = str(glossary_output_path)
    if ai_glossary_error:
        report["ai_glossary_error"] = ai_glossary_error

    report["stages"]["preprocessing"] = round(time.time() - start, 2)
    parallel_translation_enabled = bool(payload.get("parallelTranslation"))
    translation_concurrency = clamp_translation_concurrency(payload.get("translationConcurrency"))
    report["parallel_translation_enabled"] = parallel_translation_enabled
    report["translation_concurrency"] = translation_concurrency if parallel_translation_enabled else 1

    emit("status", "translating", 38, "正在按章节和段落分段翻译正文。", taskId=task_id)
    start = time.time()
    if parallel_translation_enabled:
        translated_segments = translate_segments_parallel(
            segments=segments,
            provider=str(payload["provider"]),
            api_key=str(payload["apiKey"]),
            model=str(payload["model"]),
            title=title,
            abstract=abstract,
            glossary=glossary,
            report=report,
            task_id=task_id,
            concurrency=translation_concurrency,
        )
    else:
        translated_segments = translate_segments_serial(
            segments=segments,
            provider=str(payload["provider"]),
            api_key=str(payload["apiKey"]),
            model=str(payload["model"]),
            title=title,
            abstract=abstract,
            glossary=glossary,
            report=report,
            task_id=task_id,
        )

    report["final_glossary_size"] = len(glossary)
    report["stages"]["translating"] = round(time.time() - start, 2)

    emit("status", "rebuilding", 82, "正在回填结构并写出 Markdown。", taskId=task_id)
    start = time.time()
    translated_markdown = "\n\n".join(translated_segments)
    rebuilt_markdown = restore_blocks(translated_markdown, placeholders)
    translated_md_path.write_text(rebuilt_markdown, encoding="utf-8")
    write_glossary_tsv(glossary_output_path, glossary)
    report["stages"]["rebuilding"] = round(time.time() - start, 2)

    emit("status", "rendering_pdf", 90, "正在准备 PDF 排版资源。", taskId=task_id)
    emit("status", "rendering_pdf", 93, "正在调用 Pandoc 和 Tectonic 生成 PDF，这一步首次通常会比较慢。", taskId=task_id)
    start = time.time()
    pdf_error = render_pdf(translated_md_path, translated_pdf_path)
    report["stages"]["rendering_pdf"] = round(time.time() - start, 2)
    report["pdf_generated"] = pdf_error is None and translated_pdf_path.exists()
    if pdf_error:
        report["pdf_error"] = pdf_error

    write_report(report_path, report)

    emit(
        "result",
        "completed",
        100,
        "翻译完成。",
        taskId=task_id,
        outputDir=str(output_dir),
        rawMd=str(raw_output_path),
        translatedMd=str(translated_md_path),
        translatedPdf=str(translated_pdf_path) if translated_pdf_path.exists() else None,
        reportPath=str(report_path),
        retriedSegments=report["retries"],
    )


if __name__ == "__main__":
    if not maybe_run_service_test():
        main()
