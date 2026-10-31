import { promises as fs } from "node:fs";
import path from "node:path";

const README_PATH = path.resolve(process.cwd(), "README.md");
const DATASET_PATH = path.resolve(process.cwd(), "src/data/imports/gpt-image2-prompts.json");
const START_MARKER = "<!-- op:showcase:start -->";
const END_MARKER = "<!-- op:showcase:end -->";

const OUT_DIR = path.resolve(process.cwd(), "public/local_images/readme-showcase");
const OUT_URL_BASE = "/local_images/readme-showcase";

function fail(msg) {
  // eslint-disable-next-line no-console
  console.error(msg);
  process.exit(1);
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function safeFilenameFromUrl(urlString) {
  const u = new URL(urlString);
  const base = path.basename(u.pathname);
  return base.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function downloadToFile(urlString, destPath) {
  if (await fileExists(destPath)) return;

  const res = await fetch(urlString);
  if (!res.ok) {
    throw new Error(`Fetch failed: ${urlString}\nHTTP ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(destPath, buf);
}

async function main() {
  let titleToLocalFromDataset = new Map();
  try {
    const datasetRaw = await fs.readFile(DATASET_PATH, "utf8");
    const dataset = JSON.parse(datasetRaw);
    if (Array.isArray(dataset)) {
      for (const item of dataset) {
        const title = typeof item?.title === "string" ? item.title : null;
        const img0 = Array.isArray(item?.images) ? item.images[0] : null;
        if (title && typeof img0 === "string" && img0.startsWith("/local_images/")) {
          titleToLocalFromDataset.set(title, img0);
        }
      }
    }
  } catch {
    // Optional: dataset may not exist yet
  }

  let readme;
  try {
    readme = await fs.readFile(README_PATH, "utf8");
  } catch (e) {
    fail(`Failed to read README: ${README_PATH}\n${e?.message || e}`);
  }

  const start = readme.indexOf(START_MARKER);
  const end = readme.indexOf(END_MARKER);
  if (start < 0 || end < 0 || end <= start) {
    fail(`Showcase markers not found in README (${START_MARKER} ... ${END_MARKER})`);
  }

  const before = readme.slice(0, start);
  const showcase = readme.slice(start, end);
  const after = readme.slice(end);

  const imgRe = /^<img src="([^"]+)" alt="([^"]*)" width="240" loading="lazy" \/>$/gm;
  const matches = [];
  let m;
  while ((m = imgRe.exec(showcase)) !== null) {
    matches.push({ full: m[0], src: m[1], alt: m[2] });
  }

  if (matches.length === 0) {
    fail("No showcase <img> tags found to localize.");
  }

  await fs.mkdir(OUT_DIR, { recursive: true });

  let updatedShowcase = showcase;
  for (const img of matches) {
    if (!img.src.startsWith("http")) continue;

    const fallbackLocal = titleToLocalFromDataset.get(img.alt);
    const filename = safeFilenameFromUrl(img.src);
    const destPath = path.join(OUT_DIR, filename);

    let localUrl;
    try {
      await downloadToFile(img.src, destPath);
      localUrl = `${OUT_URL_BASE}/${filename}`;
    } catch (e) {
      if (fallbackLocal) {
        localUrl = fallbackLocal;
      } else {
        // eslint-disable-next-line no-console
        console.warn(`WARN: ${e?.message || e}`);
        continue;
      }
    }

    const newLine = `<img src="${localUrl}" alt="${img.alt}" width="240" loading="lazy" />`;
    updatedShowcase = updatedShowcase.replace(img.full, newLine);
  }

  const updated = before + updatedShowcase + after;
  await fs.writeFile(README_PATH, updated, "utf8");

  // eslint-disable-next-line no-console
  console.log(
    `Localized ${matches.length} README showcase images -> ${path.relative(process.cwd(), OUT_DIR)}/`,
  );
}

main().catch((e) => fail(e?.stack || e?.message || String(e)));

