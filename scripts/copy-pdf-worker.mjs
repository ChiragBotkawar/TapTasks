import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(
  root,
  "node_modules",
  "pdfjs-dist",
  "legacy",
  "build",
  "pdf.worker.min.mjs"
);
const dest = join(root, "public", "pdf.worker.min.mjs");

mkdirSync(dirname(dest), { recursive: true });
if (!existsSync(src)) {
  console.error("pdfjs worker not found; run `npm install` first.");
  process.exit(1);
}
copyFileSync(src, dest);
console.log("Copied pdf.js worker -> public/pdf.worker.min.mjs");
