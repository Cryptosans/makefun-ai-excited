// Sanity check for the ai-excited-01 entry. Node stdlib only.
// Usage: node test/run-check.mjs
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

const MAX_BYTES = 1048576;
const MAX_DIM = 1024;

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-excited-check-"));

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function imageDimensions(buf) {
  // PNG: 8-byte signature, then IHDR width/height at bytes 16..24.
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { format: "PNG", width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // JPEG: scan markers for a SOF frame (0xC0-0xCF except 0xC4, 0xC8, 0xCC).
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i += 1; continue; }
      const marker = buf[i + 1];
      if (marker === 0xd9 || marker === 0xda) break;
      const len = buf.readUInt16BE(i + 2);
      if (len < 2) break;
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { format: "JPEG", height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
    fail("JPEG header has no SOF frame");
  }
  fail("output is neither PNG nor JPEG (magic bytes)");
}

const run = spawnSync(process.execPath, ["main.ts"], {
  cwd: repoRoot,
  env: { ...process.env, MAKEFUN_OUTPUT_DIR: tmpDir },
  encoding: "utf8",
});
if (run.status !== 0) fail(`main.ts exited ${run.status}: ${run.stderr || run.stdout}`);

const outFile = path.join(tmpDir, "entry.png");
if (!fs.existsSync(outFile)) fail("main.ts produced no entry.png");
const buf = fs.readFileSync(outFile);
if (buf.length > MAX_BYTES) fail(`entry.png is ${buf.length} bytes, over the ${MAX_BYTES} limit`);
const dims = imageDimensions(buf);
if (dims.width > MAX_DIM || dims.height > MAX_DIM) {
  fail(`entry.png is ${dims.width}x${dims.height}, over the ${MAX_DIM}x${MAX_DIM} limit`);
}
console.log(`PASS: ${dims.format} ${dims.width}x${dims.height}, ${buf.length} bytes`);
