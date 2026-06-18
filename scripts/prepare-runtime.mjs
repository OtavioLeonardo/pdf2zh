import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const runtimeRoot = path.join(root, "backend", "runtime");
const runtimeBin = path.join(runtimeRoot, "bin");
const runtimePython = path.join(runtimeRoot, "python");
const runtimeFonts = path.join(runtimeRoot, "fonts");
const runtimeTypst = path.join(runtimeRoot, "typst");
const runtimeTypstPackages = path.join(runtimeTypst, "packages");

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
ensureDir(runtimeFonts);
ensureDir(runtimeTypstPackages);

const copied = [];

if (
  maybeCopy(
    process.env.PDF2ZH_BUNDLE_TYPST,
    path.join(runtimeBin, process.platform === "win32" ? "typst.exe" : "typst"),
    "Typst binary",
  )
) {
  copied.push("typst");
}

if (
  maybeCopy(
    process.env.PDF2ZH_BUNDLE_FONTS_DIR,
    runtimeFonts,
    "Bundled fonts directory",
  )
) {
  copied.push("fonts");
}

if (
  maybeCopy(
    process.env.PDF2ZH_BUNDLE_TYPST_PACKAGES_DIR,
    runtimeTypstPackages,
    "Bundled Typst packages directory",
  )
) {
  copied.push("typst-packages");
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
    "No runtime assets copied. Set PDF2ZH_BUNDLE_TYPST / PDF2ZH_BUNDLE_FONTS_DIR / PDF2ZH_BUNDLE_TYPST_PACKAGES_DIR / PDF2ZH_BUNDLE_PYTHON_HOME / PDF2ZH_BUNDLE_PYTHON_BIN.",
  );
} else {
  console.log(`Prepared runtime assets: ${copied.join(", ")}`);
}
