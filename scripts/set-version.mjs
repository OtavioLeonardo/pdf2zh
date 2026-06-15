import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const nextVersion = process.argv[2]?.trim();

if (!nextVersion) {
  console.error("Usage: npm run version:set -- <version>");
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(nextVersion)) {
  console.error(`Invalid version: ${nextVersion}`);
  process.exit(1);
}

function updateJsonVersion(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  parsed.version = nextVersion;
  if (parsed.packages?.[""]) {
    parsed.packages[""].version = nextVersion;
  }
  fs.writeFileSync(filePath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
}

function updateCargoTomlVersion(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const packageVersionPattern = /(\[package\][\s\S]*?^version = )".*"$/m;
  if (!packageVersionPattern.test(raw)) {
    throw new Error(`Could not find version field in ${filePath}`);
  }

  const updated = raw.replace(packageVersionPattern, `$1"${nextVersion}"`);
  fs.writeFileSync(filePath, updated, "utf8");
}

updateJsonVersion(path.join(rootDir, "package.json"));
updateJsonVersion(path.join(rootDir, "package-lock.json"));
updateJsonVersion(path.join(rootDir, "src-tauri", "tauri.conf.json"));
updateCargoTomlVersion(path.join(rootDir, "src-tauri", "Cargo.toml"));

console.log(`Updated app version to ${nextVersion}`);
