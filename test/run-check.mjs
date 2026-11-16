// Local sanity check for the ai-excited-01 entry. Node stdlib only.
// Runs main.ts into a throwaway directory and checks the image it writes
// against the competition's limits: at most 1 MiB, at most 1024x1024,
// PNG or JPEG as told by its first bytes.
// Usage: node test/run-check.mjs
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const MAX_BYTES = 1024 * 1024;
const MAX_SIDE = 1024;
const PNG_MAGIC = 0x89504e47;
const JPEG_MAGIC = [0xff, 0xd8];

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "ai-excited-run-check-"));

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

// Read width/height out of a PNG IHDR chunk or a JPEG SOF frame.
function dimensionsOf(buf) {
  if (buf.length >= 24 && buf.readUInt32BE(0) === PNG_MAGIC) {
    return { format: "PNG", width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length >= 4 && buf[0] === JPEG_MAGIC[0] && buf[1] === JPEG_MAGIC[1]) {
    // Walk the marker segments until a Start Of Frame turns up.
    let offset = 2;
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buf[offset + 1];
      if (marker === 0xd9 || marker === 0xda) break; // EOI / start of scan
      const segmentLength = buf.readUInt16BE(offset + 2);
      if (segmentLength < 2) break;
      const isSof =
        marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) {
        return {
          format: "JPEG",
          height: buf.readUInt16BE(offset + 5),
          width: buf.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + segmentLength;
    }
    fail("JPEG has no SOF frame in its headers");
  }
  fail("output bytes are neither PNG nor JPEG");
}

const run = spawnSync(process.execPath, ["main.ts"], {
  cwd: repoRoot,
  env: { ...process.env, MAKEFUN_OUTPUT_DIR: scratch },
  encoding: "utf8",
});
if (run.status !== 0) {
  fail(`main.ts exited with status ${run.status}: ${(run.stderr || run.stdout || "").trim()}`);
}

const outPath = path.join(scratch, "entry.png");
if (!fs.existsSync(outPath)) fail("main.ts wrote no entry.png");
const bytes = fs.readFileSync(outPath);
if (bytes.length > MAX_BYTES) {
  fail(`entry.png is ${bytes.length} bytes, over the ${MAX_BYTES} byte limit`);
}
const dims = dimensionsOf(bytes);
if (dims.width > MAX_SIDE || dims.height > MAX_SIDE) {
  fail(`entry.png is ${dims.width}x${dims.height}, over the ${MAX_SIDE}x${MAX_SIDE} limit`);
}
console.log(`PASS: ${dims.format} ${dims.width}x${dims.height}, ${bytes.length} bytes`);
