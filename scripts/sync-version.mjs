import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const packageJsonPath = path.join(rootDir, "package.json");
const packageLockPath = path.join(rootDir, "package-lock.json");
const cargoTomlPath = path.join(rootDir, "src-tauri", "Cargo.toml");
const cargoLockPath = path.join(rootDir, "src-tauri", "Cargo.lock");
const tauriConfigPath = path.join(rootDir, "src-tauri", "tauri.conf.json");

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");
const expectedTag = process.env.GITHUB_REF_NAME ?? process.env.RELEASE_TAG ?? null;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function replaceVersionLine(source, matcher, nextVersion) {
  if (!source.match(matcher)) {
    throw new Error(`Could not find version field in ${matcher}`);
  }

  return source.replace(matcher, `$1${nextVersion}$3`);
}

const tauriConfig = readJson(tauriConfigPath);
const sourceVersion = tauriConfig.version;

if (!sourceVersion) {
  throw new Error("src-tauri/tauri.conf.json is missing version");
}

if (expectedTag) {
  const normalizedTag = expectedTag.startsWith("v") ? expectedTag.slice(1) : expectedTag;
  if (normalizedTag !== sourceVersion) {
    throw new Error(
      `Tag version mismatch: tag=${expectedTag}, app=${sourceVersion}. Expected tag v${sourceVersion}.`,
    );
  }
}

const packageJson = readJson(packageJsonPath);
const packageLock = readJson(packageLockPath);
const cargoToml = fs.readFileSync(cargoTomlPath, "utf8");
const cargoLock = fs.readFileSync(cargoLockPath, "utf8");

const currentVersions = {
  packageJson: packageJson.version,
  packageLock: packageLock.version,
  packageLockRoot: packageLock.packages?.[""]?.version,
  cargoToml: cargoToml.match(/^version = "([^"]+)"$/m)?.[1] ?? null,
  cargoLock: cargoLock.match(/name = "pdf2zh"\nversion = "([^"]+)"/)?.[1] ?? null,
};

const mismatches = Object.entries(currentVersions).filter(([, version]) => version !== sourceVersion);

if (checkOnly) {
  if (mismatches.length > 0) {
    const details = mismatches.map(([name, version]) => `${name}=${version ?? "missing"}`).join(", ");
    throw new Error(`Version mismatch against src-tauri/tauri.conf.json (${sourceVersion}): ${details}`);
  }

  console.log(`Versions are in sync at ${sourceVersion}`);
  process.exit(0);
}

packageJson.version = sourceVersion;
packageLock.version = sourceVersion;
if (packageLock.packages?.[""]) {
  packageLock.packages[""].version = sourceVersion;
}

writeJson(packageJsonPath, packageJson);
writeJson(packageLockPath, packageLock);

const nextCargoToml = replaceVersionLine(cargoToml, /(^version = ")([^"]+)(")$/m, sourceVersion);
fs.writeFileSync(cargoTomlPath, nextCargoToml);

const nextCargoLock = cargoLock.replace(
  /(name = "pdf2zh"\nversion = ")([^"]+)(")/,
  `$1${sourceVersion}$3`,
);

if (nextCargoLock === cargoLock) {
  throw new Error("Could not update pdf2zh package version in src-tauri/Cargo.lock");
}

fs.writeFileSync(cargoLockPath, nextCargoLock);

console.log(`Synced package.json, package-lock.json, Cargo.toml and Cargo.lock to ${sourceVersion}`);
