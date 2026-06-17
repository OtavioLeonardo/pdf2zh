import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const cacheRoot = process.env.PDF2ZH_BUNDLE_TECTONIC_CACHE;
const tectonicBin = process.env.PDF2ZH_BUNDLE_TECTONIC;
const pandocBin = process.env.PDF2ZH_BUNDLE_PANDOC;

function log(message) {
  console.log(`[prepare-tectonic-cache] ${message}`);
}

function quoteArg(arg) {
  return /\s/.test(arg) ? JSON.stringify(arg) : arg;
}

function formatCommand(command, args) {
  return [quoteArg(command), ...args.map(quoteArg)].join(" ");
}

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
log(`root: ${root}`);
log(`pandoc: ${pandocBin}`);
log(`tectonic: ${tectonicBin}`);
log(`cache root: ${resolvedCacheRoot}`);

log("resetting cache directory");
fs.rmSync(resolvedCacheRoot, { recursive: true, force: true });
fs.mkdirSync(resolvedCacheRoot, { recursive: true });

const buildDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf2zh-tectonic-cache-"));
const sampleMd = path.join(buildDir, "sample.md");
const samplePdf = path.join(buildDir, "sample.pdf");
const defaultsFile = path.join(root, "backend", "pandoc", "defaults.yaml");
const resourcePath = path.join(root, "backend", "pandoc");

function runChecked(command, args, options = {}) {
  const startedAt = Date.now();
  log(`running: ${formatCommand(command, args)}`);

  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "inherit", "inherit"],
    ...options,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${path.basename(command)} failed with exit code ${result.status}`);
  }

  log(`finished in ${Date.now() - startedAt} ms`);
  return result.stdout?.trim() || result.stderr?.trim();
}

function copyDirRecursive(source, destination) {
  fs.mkdirSync(destination, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(sourcePath, destinationPath);
    } else {
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
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

log(`wrote probe markdown: ${sampleMd}`);
log(`probe pdf output: ${samplePdf}`);
log("warming cache with pandoc + tectonic");

runChecked(
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
    env: {
      ...process.env,
      TECTONIC_CACHE_DIR: resolvedCacheRoot,
    },
  },
);

if (countFilesRecursive(resolvedCacheRoot) === 0) {
  log("cache directory is still empty after render; checking tectonic default user cache");
  const defaultCacheRoot = runChecked(
    tectonicBin,
    ["-X", "show", "user-cache-dir"],
    {
      cwd: resourcePath,
      env: {
        ...process.env,
      },
    },
  );

  if (defaultCacheRoot && path.resolve(defaultCacheRoot) !== resolvedCacheRoot && fs.existsSync(defaultCacheRoot)) {
    log(`copying existing cache from ${defaultCacheRoot}`);
    copyDirRecursive(defaultCacheRoot, resolvedCacheRoot);
  }
}

if (countFilesRecursive(resolvedCacheRoot) === 0) {
  throw new Error(`Prepared Tectonic cache seed is still empty at ${resolvedCacheRoot}`);
}

log(`prepared bundled Tectonic cache seed at ${resolvedCacheRoot}`);
