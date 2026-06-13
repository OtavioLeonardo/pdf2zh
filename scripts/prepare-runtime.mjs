import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const runtimeRoot = path.join(root, "backend", "runtime");
const runtimeBin = path.join(runtimeRoot, "bin");
const runtimePython = path.join(runtimeRoot, "python");

function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true });
}

function copyFileOrDir(source, destination) {
  const stat = fs.statSync(source);

  if (stat.isDirectory()) {
    fs.cpSync(source, destination, { recursive: true, force: true });
    return;
  }

  ensureDir(path.dirname(destination));
  fs.copyFileSync(source, destination);
  fs.chmodSync(destination, stat.mode);
}

function maybeCopy(source, destination, label) {
  if (!source) {
    return false;
  }

  if (!fs.existsSync(source)) {
    throw new Error(`${label} not found: ${source}`);
  }

  copyFileOrDir(source, destination);
  return true;
}

ensureDir(runtimeBin);
ensureDir(runtimePython);

const copied = [];

if (
  maybeCopy(
    process.env.PDF2ZH_BUNDLE_PANDOC,
    path.join(runtimeBin, process.platform === "win32" ? "pandoc.exe" : "pandoc"),
    "Pandoc binary",
  )
) {
  copied.push("pandoc");
}

if (
  maybeCopy(
    process.env.PDF2ZH_BUNDLE_TECTONIC,
    path.join(runtimeBin, process.platform === "win32" ? "tectonic.exe" : "tectonic"),
    "Tectonic binary",
  )
) {
  copied.push("tectonic");
}

if (
  maybeCopy(
    process.env.PDF2ZH_BUNDLE_PYTHON_HOME,
    runtimePython,
    "Bundled Python home",
  )
) {
  copied.push("python-home");
}

if (
  maybeCopy(
    process.env.PDF2ZH_BUNDLE_PYTHON_BIN,
    path.join(runtimePython, "bin", process.platform === "win32" ? "python.exe" : "python3"),
    "Bundled Python binary",
  )
) {
  copied.push("python-bin");
}

if (copied.length === 0) {
  console.log(
    "No runtime assets copied. Set PDF2ZH_BUNDLE_PANDOC / PDF2ZH_BUNDLE_TECTONIC / PDF2ZH_BUNDLE_PYTHON_HOME / PDF2ZH_BUNDLE_PYTHON_BIN.",
  );
} else {
  console.log(`Prepared runtime assets: ${copied.join(", ")}`);
}
