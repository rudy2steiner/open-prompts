import { promises as fs } from "node:fs";
import path from "node:path";

const DEFAULT_INPUT =
  "/Users/xxx/.qoderwork/workspace/molmwhbpiuhabtq8/outputs/gpt-image2-prompts/prompts_data.json";

const args = process.argv.slice(2);
const argInput = args.find((a) => a && !a.startsWith("-"));
const fromExisting = args.includes("--from-existing");
const skipDownload = args.includes("--skip-download");
const limitIdx = args.indexOf("--limit");
const limit =
  limitIdx >= 0 ? Number.parseInt(args[limitIdx + 1] || "", 10) : Number.POSITIVE_INFINITY;

const inputPath = fromExisting
  ? path.resolve(process.cwd(), "src/data/imports/gpt-image2-prompts.json")
  : argInput || DEFAULT_INPUT;
const outputPath = path.resolve(
  process.cwd(),
  "src/data/imports/gpt-image2-prompts.json",
);
const publicImagesDir = path.resolve(
  process.cwd(),
  "public/local_images/gpt-image2-prompts",
);
const publicImagesUrlBase = "/local_images/gpt-image2-prompts";

function fail(msg) {
  // eslint-disable-next-line no-console
  console.error(msg);
  process.exit(1);
}

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === "string" && v.trim().length > 0);
}

function slugify(input) {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function extFromUrl(urlString) {
  try {
    const u = new URL(urlString);
    const ext = path.extname(u.pathname);
    if (ext && ext.length <= 6) return ext;
  } catch {
    // ignore
  }
  return ".jpg";
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function downloadToFile(urlString, destPath) {
  if (await fileExists(destPath)) return;

  let res;
  try {
    res = await fetch(urlString);
  } catch (e) {
    throw new Error(`Fetch failed: ${urlString}\n${e?.message || e}`);
  }

  if (!res.ok) {
    throw new Error(`Fetch failed: ${urlString}\nHTTP ${res.status} ${res.statusText}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(destPath, buf);
}

async function main() {
  if (args.includes("--help") || args.includes("-h")) {
    // eslint-disable-next-line no-console
    console.log(
      [
        "Usage:",
        "  node scripts/import-gpt-image2-prompts.mjs <input.json>",
        "  node scripts/import-gpt-image2-prompts.mjs --from-existing [--limit N] [--skip-download]",
        "",
        "Options:",
        "  --from-existing   Use src/data/imports/gpt-image2-prompts.json as input",
        "  --limit N         Only process first N items (useful for testing)",
        "  --skip-download   Do not download images, only normalize local_images + write JSON",
      ].join("\n"),
    );
    return;
  }

  let raw;
  try {
    raw = await fs.readFile(inputPath, "utf8");
  } catch (e) {
    fail(`Failed to read input file: ${inputPath}\n${e?.message || e}`);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    fail(`Input is not valid JSON: ${inputPath}\n${e?.message || e}`);
  }

  if (!Array.isArray(data)) {
    fail(`Expected JSON array, got ${typeof data}`);
  }

  // Basic sanity checks (non-fatal, but keep output clean)
  const sliced = Number.isFinite(limit) ? data.slice(0, Math.max(0, limit)) : data;

  const cleaned = sliced
    .filter((item) => item && typeof item === "object")
    .map((item, idx) => {
      const title = typeof item.title === "string" ? item.title : `Untitled ${idx + 1}`;
      const images = asStringArray(item.images);
      const providedLocal = asStringArray(item.local_images);

      const base = `${String(idx + 1).padStart(2, "0")}_${slugify(title) || `prompt_${idx + 1}`}`;
      const local_images = images.map((url, i) => {
        const provided = providedLocal[i];
        if (provided) return provided;
        const ext = extFromUrl(url);
        const suffix = images.length > 1 ? `_${i + 1}` : "";
        return `${base}${suffix}${ext}`;
      });

      const local_image_urls = local_images.map((f) => `${publicImagesUrlBase}/${f}`);

      return {
        ...item,
        remote_images: images,
        local_images,
        images: local_image_urls,
      };
    });

  if (!skipDownload) {
    await fs.mkdir(publicImagesDir, { recursive: true });
    for (const item of cleaned) {
      const images = asStringArray(item.images);
      const local = asStringArray(item.local_images);
      for (let i = 0; i < images.length; i++) {
        const url = images[i];
        const filename = local[i];
        if (!url || !filename) continue;
        const dest = path.join(publicImagesDir, filename);
        await downloadToFile(url, dest);
      }
    }
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(cleaned, null, 2) + "\n", "utf8");

  // eslint-disable-next-line no-console
  console.log(
    `Imported ${cleaned.length} prompts -> ${path.relative(process.cwd(), outputPath)}\n` +
      (skipDownload
        ? "Images download skipped"
        : `Images -> ${path.relative(process.cwd(), publicImagesDir)}/`),
  );
}

main().catch((e) => {
  fail(e?.stack || e?.message || String(e));
});

