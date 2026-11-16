// Entry program for make.fun bounty ai-excited-01.
// Copies the pre-rendered entry image into the grader's output directory.
// Node 22+ stdlib only. Runs twice in the grader; both runs write identical bytes.
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
const source = path.join(here, "entry.png");
const dest = path.join(outDir, "entry.png");

try {
  if (!fs.existsSync(source)) {
    console.error(`entry image missing: ${source}`);
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.copyFileSync(source, dest);
  const bytes = fs.statSync(dest).size;
  console.log(`wrote ${dest} (${bytes} bytes)`);
} catch (err) {
  console.error(`failed to write entry image: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
