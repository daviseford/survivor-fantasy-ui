import * as fs from "fs";
import * as path from "path";
import sharp, { type Sharp } from "sharp";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const IMAGES_DIR = path.join(PROJECT_ROOT, "public", "images");
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

type OptimizeRule = {
  maxWidth: number;
  maxHeight: number;
  jpegQuality?: number;
  pngQuality?: number;
  webpQuality?: number;
};

const PLAYER_RULE: OptimizeRule = {
  maxWidth: 450,
  maxHeight: 450,
  jpegQuality: 82,
  pngQuality: 82,
  webpQuality: 82,
};

const LOGO_RULE: OptimizeRule = {
  maxWidth: 1400,
  maxHeight: 900,
  jpegQuality: 84,
  pngQuality: 85,
  webpQuality: 84,
};

function formatKB(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

function getRule(filePath: string): OptimizeRule {
  const isLogo = /season-\d+-logo\./i.test(path.basename(filePath));
  return isLogo ? LOGO_RULE : PLAYER_RULE;
}

function applyFormat(pipeline: Sharp, ext: string, rule: OptimizeRule): Sharp {
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return pipeline.jpeg({
        quality: rule.jpegQuality ?? 82,
        mozjpeg: true,
        progressive: true,
      });
    case ".png":
      return pipeline.png({
        quality: rule.pngQuality ?? 82,
        compressionLevel: 9,
        palette: true,
        effort: 10,
      });
    case ".webp":
      return pipeline.webp({
        quality: rule.webpQuality ?? 82,
        effort: 6,
      });
    default:
      return pipeline;
  }
}

async function optimizeFile(filePath: string): Promise<{
  changed: boolean;
  bytesSaved: number;
}> {
  const input = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const rule = getRule(filePath);

  const resized = sharp(input, { animated: false }).rotate().resize({
    width: rule.maxWidth,
    height: rule.maxHeight,
    fit: "inside",
    withoutEnlargement: true,
  });

  const output = await applyFormat(resized, ext, rule).toBuffer();
  if (output.length >= input.length) {
    return { changed: false, bytesSaved: 0 };
  }

  fs.writeFileSync(filePath, output);
  return { changed: true, bytesSaved: input.length - output.length };
}

async function main(): Promise<void> {
  if (!fs.existsSync(IMAGES_DIR)) {
    console.log("No public/images directory found.");
    return;
  }

  const files = walk(IMAGES_DIR);
  let changed = 0;
  let totalBytesSaved = 0;

  for (const file of files) {
    const result = await optimizeFile(file);
    if (!result.changed) continue;

    changed++;
    totalBytesSaved += result.bytesSaved;
    console.log(
      `${path.relative(PROJECT_ROOT, file)}: saved ${formatKB(result.bytesSaved)}`,
    );
  }

  console.log(
    `Optimized ${changed}/${files.length} files, saved ${formatMB(totalBytesSaved)} total`,
  );
}

main().catch((err) => {
  console.error("Image optimization failed:", err);
  process.exit(1);
});
