import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const runtimeRoot = process.env.PDF2ZH_RUNTIME_ROOT
  ? path.resolve(process.env.PDF2ZH_RUNTIME_ROOT)
  : path.join(root, "backend", "runtime");
const runtimeBin = path.join(runtimeRoot, "bin");
const runtimePython = path.join(runtimeRoot, "python");
const runtimeTectonicCache = path.join(runtimeRoot, "tectonic-cache");

function firstExisting(paths) {
  const candidates = Array.isArray(paths) ? paths : [paths];
  return candidates.find((candidate) => candidate && fs.existsSync(candidate));
}

function countFilesRecursive(target) {
  if (!fs.existsSync(target)) {
    return 0;
  }

  let count = 0;
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const entryPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      count += countFilesRecursive(entryPath);
    } else {
      count += 1;
    }
  }
  return count;
}

function runChecked(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `${path.basename(command)} exited with code ${result.status ?? "unknown"}.\n${result.stderr || result.stdout}`,
    );
  }

  return (result.stdout || result.stderr || "").trim();
}

const pandoc = firstExisting([
  path.join(runtimeBin, "pandoc.exe"),
  path.join(runtimeBin, "pandoc"),
]);
const tectonic = firstExisting([
  path.join(runtimeBin, "tectonic.exe"),
  path.join(runtimeBin, "tectonic"),
]);
const python = firstExisting([
  path.join(runtimePython, "python.exe"),
  path.join(runtimePython, "python3.exe"),
  path.join(runtimePython, "bin", "python.exe"),
  path.join(runtimePython, "bin", "python3.exe"),
  path.join(runtimePython, "bin", "python3"),
  path.join(runtimePython, "bin", "python"),
]);

if (!pandoc) {
  throw new Error("Bundled pandoc was not prepared.");
}
if (!tectonic) {
  throw new Error("Bundled tectonic was not prepared.");
}
if (!python) {
  throw new Error("Bundled Python interpreter was not prepared.");
}
if (!fs.existsSync(runtimeTectonicCache)) {
  throw new Error("Bundled Tectonic cache seed was not prepared.");
}
const tectonicCacheEntries = fs.readdirSync(runtimeTectonicCache);
if (tectonicCacheEntries.length === 0) {
  throw new Error("Bundled Tectonic cache seed is empty.");
}
if (countFilesRecursive(runtimeTectonicCache) === 0) {
  throw new Error("Bundled Tectonic cache seed has no files.");
}

console.log(`Verified bundled Python: ${python}`);
console.log(`Verified bundled pandoc: ${pandoc}`);
console.log(`Verified bundled tectonic: ${tectonic}`);
console.log(`Verified bundled Tectonic cache seed: ${runtimeTectonicCache}`);
console.log(runChecked(python, ["--version"]));
console.log(runChecked(pandoc, ["--version"]).split(/\r?\n/).slice(0, 2).join("\n"));
console.log(runChecked(tectonic, ["--version"]));
