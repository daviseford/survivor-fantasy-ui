/**
 * One-off script to generate favicon PNGs, apple-touch-icon, and OG image
 * from the custom SVG favicon source using sharp.
 *
 * Usage: yarn tsx scripts/generate-web-assets.ts
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, "..", "public");
const faviconSvg = fs.readFileSync(path.join(PUBLIC, "favicon.svg"));

async function generateFaviconPngs() {
  // 16x16
  await sharp(faviconSvg)
    .resize(16, 16)
    .png()
    .toFile(path.join(PUBLIC, "favicon-16x16.png"));

  // 32x32
  await sharp(faviconSvg)
    .resize(32, 32)
    .png()
    .toFile(path.join(PUBLIC, "favicon-32x32.png"));

  // 180x180 apple-touch-icon (white background, padded)
  const iconSize = 180;
  const iconPadding = 20;
  const innerSize = iconSize - iconPadding * 2;

  const resizedIcon = await sharp(faviconSvg)
    .resize(innerSize, innerSize)
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: iconSize,
      height: iconSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: resizedIcon, left: iconPadding, top: iconPadding }])
    .png()
    .toFile(path.join(PUBLIC, "apple-touch-icon.png"));

  console.log("✓ favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png");
}

async function generateOgImage() {
  const width = 1200;
  const height = 630;

  // Create gradient background with text overlay using SVG
  const svgOverlay = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1864ab;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#1971c2;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0c8599;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#228be6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#15aabf;stop-opacity:1" />
        </linearGradient>
      </defs>

      <!-- Background gradient -->
      <rect width="${width}" height="${height}" fill="url(#bg)" />

      <!-- Subtle pattern overlay -->
      <rect width="${width}" height="${height}" fill="black" opacity="0.08" />

      <!-- Torch icon — same paths as public/favicon.svg but brighter fills for visibility on the blue gradient -->
      <g transform="translate(100, 160) scale(9)">
        <rect x="14" y="16" width="4" height="14" rx="1.5" fill="#c9a96e" opacity="0.9"/>
        <path d="M16 2c-1.5 3-6 6-6 10.5C10 16.1 12.7 18 16 18s6-1.9 6-5.5C22 8 17.5 5 16 2z" fill="#FF6B35" opacity="0.95"/>
        <path d="M16 7c-1 2-3.5 3.5-3.5 6.5 0 2 1.5 3.5 3.5 3.5s3.5-1.5 3.5-3.5C19.5 10.5 17 9 16 7z" fill="#FFD166"/>
      </g>

      <!-- Title text -->
      <text x="420" y="240" font-family="system-ui, -apple-system, sans-serif" font-size="72" font-weight="900" fill="white" letter-spacing="-2">
        Survivor
      </text>
      <text x="420" y="330" font-family="system-ui, -apple-system, sans-serif" font-size="72" font-weight="900" fill="url(#accent)" letter-spacing="-2">
        Fantasy
      </text>

      <!-- Tagline -->
      <text x="420" y="400" font-family="system-ui, -apple-system, sans-serif" font-size="28" fill="white" opacity="0.8">
        Draft your team. Compete with friends.
      </text>

      <!-- Stats bar at bottom -->
      <rect x="0" y="${height - 80}" width="${width}" height="80" fill="black" opacity="0.2"/>
      <text x="100" y="${height - 32}" font-family="system-ui, -apple-system, sans-serif" font-size="22" fill="white" opacity="0.9">
        50 Seasons  ·  700+ Castaways  ·  Real-time Drafts  ·  Spoiler-free
      </text>
    </svg>`;

  await sharp(Buffer.from(svgOverlay))
    .png({ quality: 90 })
    .toFile(path.join(PUBLIC, "og-image.png"));

  console.log("✓ og-image.png (1200×630)");
}

async function main() {
  await generateFaviconPngs();
  await generateOgImage();
  console.log("\nAll assets generated in public/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
