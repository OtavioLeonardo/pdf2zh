import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const templatePath = path.join(rootDir, "release-notes.md");
const tauriConfigPath = path.join(rootDir, "src-tauri", "tauri.conf.json");

const args = process.argv.slice(2);
const outputArgIndex = args.findIndex((arg) => arg === "--output");
const outputPath =
  outputArgIndex >= 0 && args[outputArgIndex + 1]
    ? path.resolve(process.cwd(), args[outputArgIndex + 1])
    : path.join(rootDir, "release-notes.generated.md");

const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, "utf8"));
const version = tauriConfig.version;
const template = fs.readFileSync(templatePath, "utf8");
const content = template.replaceAll("{{version}}", version);

fs.writeFileSync(outputPath, content);
console.log(`Generated release notes at ${outputPath}`);
