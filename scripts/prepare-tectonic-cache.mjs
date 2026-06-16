import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const cacheRoot = process.env.PDF2ZH_BUNDLE_TECTONIC_CACHE;
const tectonicBin = process.env.PDF2ZH_BUNDLE_TECTONIC;
const pandocBin = process.env.PDF2ZH_BUNDLE_PANDOC;

if (!cacheRoot) {
  throw new Error("PDF2ZH_BUNDLE_TECTONIC_CACHE is required.");
}
if (!tectonicBin || !fs.existsSync(tectonicBin)) {
  throw new Error("PDF2ZH_BUNDLE_TECTONIC must point to an existing tectonic binary.");
}
if (!pandocBin || !fs.existsSync(pandocBin)) {
  throw new Error("PDF2ZH_BUNDLE_PANDOC must point to an existing pandoc binary.");
}

const resolvedCacheRoot = path.resolve(cacheRoot);
fs.rmSync(resolvedCacheRoot, { recursive: true, force: true });
fs.mkdirSync(resolvedCacheRoot, { recursive: true });

const buildDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf2zh-tectonic-cache-"));
const sampleMd = path.join(buildDir, "sample.md");
const samplePdf = path.join(buildDir, "sample.pdf");
const defaultsFile = path.join(root, "backend", "pandoc", "defaults.yaml");
const resourcePath = path.join(root, "backend", "pandoc");

fs.writeFileSync(
  sampleMd,
  [
    "# PDF2ZH Runtime Probe",
    "",
    "This document warms the bundled Tectonic cache for offline PDF rendering.",
    "",
    "## Unicode",
    "",
    "中文段落用于触发 xeCJK 和字体相关资源。",
    "",
    "## Table",
    "",
    "| Column A | Column B |",
    "| --- | --- |",
    "| 1 | 2 |",
    "",
    "> 引用环境用于命中模板中的额外字体设置。",
    "",
    "$$",
    "E = mc^2",
    "$$",
    "",
  ].join("\n"),
  "utf8",
);

const result = spawnSync(
  pandocBin,
  [
    sampleMd,
    "--defaults",
    defaultsFile,
    `--resource-path=${buildDir}${path.delimiter}${resourcePath}`,
    `--pdf-engine=${tectonicBin}`,
    "--pdf-engine-opt=--keep-logs",
    "--output",
    samplePdf,
  ],
  {
    cwd: resourcePath,
    encoding: "utf8",
    env: {
      ...process.env,
      TECTONIC_CACHE_DIR: resolvedCacheRoot,
    },
  },
);

if (result.error) {
  throw result.error;
}
if (result.status !== 0) {
  throw new Error(result.stderr || result.stdout || `tectonic cache warmup failed with exit code ${result.status}`);
}

console.log(`Prepared bundled Tectonic cache seed at ${resolvedCacheRoot}`);
