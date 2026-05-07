import { promises as fs } from "node:fs";
import path from "node:path";

const DEFAULT_INPUT =
  "/Users/xuandu/.qoderwork/workspace/molmwhbpiuhabtq8/outputs/gpt-image2-prompts/prompts_data.json";

const inputPath = process.argv[2] || DEFAULT_INPUT;
const outputPath = path.resolve(
  process.cwd(),
  "src/data/imports/gpt-image2-prompts.json",
);

function fail(msg) {
  // eslint-disable-next-line no-console
  console.error(msg);
  process.exit(1);
}

async function main() {
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
  const cleaned = data
    .filter((item) => item && typeof item === "object")
    .map((item) => item);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(cleaned, null, 2) + "\n", "utf8");

  // eslint-disable-next-line no-console
  console.log(
    `Imported ${cleaned.length} prompts -> ${path.relative(process.cwd(), outputPath)}`,
  );
}

main().catch((e) => {
  fail(e?.stack || e?.message || String(e));
});

