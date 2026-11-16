// ai-excited-01 entry program.
// Ships the entry image to the grader's output directory as entry.png.
// Node 22+ standard library only, plain JavaScript syntax so it runs under
// `node main.ts` with no flags. Deterministic: both grader runs emit
// byte-identical output, because the file is copied, never re-encoded.
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const OUTPUT_FILE = "entry.png";
const FALLBACK_OUTPUT_DIR = "/output";

function fail(message) {
  console.error(message);
  process.exit(1);
}

const repoDir = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(repoDir, OUTPUT_FILE);
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || FALLBACK_OUTPUT_DIR;
const destPath = path.join(outputDir, OUTPUT_FILE);

if (!fs.existsSync(sourcePath)) {
  fail(`entry image not found: ${sourcePath}`);
}

try {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.copyFileSync(sourcePath, destPath);
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  fail(`could not write ${destPath}: ${detail}`);
}

const writtenBytes = fs.statSync(destPath).size;
console.log(`wrote ${destPath} (${writtenBytes} bytes)`);
