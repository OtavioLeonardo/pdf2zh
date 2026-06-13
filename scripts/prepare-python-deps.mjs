import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const runtimeRoot = path.join(root, "backend", "runtime");
const targetDir = path.join(runtimeRoot, "site-packages");
const requirementsFile = path.join(root, "backend", "requirements-runtime.txt");

function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true });
}

function resolvePythonBin() {
  const candidates = [
    process.env.PDF2ZH_RUNTIME_PYTHON,
    process.env.PDF2ZH_BUNDLE_PYTHON_BIN,
    process.env.PDF2ZH_PYTHON,
    "python3",
  ].filter(Boolean);

  return candidates[0];
}

const pythonBin = resolvePythonBin();

if (!pythonBin) {
  throw new Error("No Python interpreter available for runtime dependency installation.");
}

if (!fs.existsSync(requirementsFile)) {
  throw new Error(`Missing requirements file: ${requirementsFile}`);
}

ensureDir(targetDir);

const extraArgs = (process.env.PDF2ZH_PIP_EXTRA_ARGS || "")
  .split(" ")
  .map((value) => value.trim())
  .filter(Boolean);

const result = spawnSync(
  pythonBin,
  [
    "-m",
    "pip",
    "install",
    "--upgrade",
    "-r",
    requirementsFile,
    "--target",
    targetDir,
    ...extraArgs,
  ],
  {
    stdio: "inherit",
    cwd: root,
  },
);

if (result.status !== 0) {
  throw new Error(`pip install failed with exit code ${result.status ?? "unknown"}`);
}

console.log(`Prepared runtime Python dependencies in ${targetDir}`);
