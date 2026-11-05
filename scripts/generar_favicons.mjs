import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { execSync } from "node:child_process";

const projectRoot = path.resolve(import.meta.dirname, "..");
const publicDir = path.join(projectRoot, "public");
const appDir = path.join(projectRoot, "src/app");

const svgFaviconContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <!-- Fondo institucional de alto contraste para pestañas claras y oscuras -->
  <rect width="128" height="128" rx="28" fill="#0F172A"/>
  <rect x="1" y="1" width="126" height="126" rx="27" stroke="#1E293B" stroke-width="2"/>
  
  <!-- Isotipo P: Ágora Concéntrica de POLIS -->
  <g transform="translate(64, 64) scale(0.52) translate(-112, -99)">
    <path d="M44 176 V90" stroke="#0369A1" stroke-width="18" stroke-linecap="round"/>
    <path d="M44 90 C44 52.4446 74.4446 22 112 22 C149.555 22 180 52.4446 180 90 C180 127.555 149.555 158 112 158 H78" stroke="#38BDF8" stroke-width="18" stroke-linecap="round"/>
    <path d="M68 90 C68 65.6995 87.6995 46 112 46 C136.301 46 156 65.6995 156 90 C156 114.301 136.301 134 112 134" stroke="#0284C7" stroke-width="14" stroke-linecap="round"/>
    <circle cx="112" cy="90" r="22" fill="#7DD3FC"/>
    <circle cx="112" cy="90" r="9" fill="#FFFFFF"/>
  </g>
</svg>`;

async function main() {
  console.log("Generando favicon e iconografía oficial POLIS...");

  // 1. Guardar SVG en public/favicon.svg y src/app/icon.svg
  fs.writeFileSync(path.join(publicDir, "favicon.svg"), svgFaviconContent, "utf8");
  fs.writeFileSync(path.join(appDir, "icon.svg"), svgFaviconContent, "utf8");
  console.log("  ✓ public/favicon.svg y src/app/icon.svg creados");

  // 2. Renderizar PNGs en distintas resoluciones
  const svgBuffer = Buffer.from(svgFaviconContent);

  // Apple touch icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, "apple-touch-icon.png"));
  console.log("  ✓ public/apple-touch-icon.png (180x180) generado");

  // Iconos PWA 192x192 y 512x512
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, "icon-192.png"));
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, "icon-512.png"));
  console.log("  ✓ public/icon-192.png y public/icon-512.png generados");

  // Iconos para favicon.ico (16, 32, 48)
  const tmp16 = "/tmp/favicon-16.png";
  const tmp32 = "/tmp/favicon-32.png";
  const tmp48 = "/tmp/favicon-48.png";

  await sharp(svgBuffer).resize(16, 16).png().toFile(tmp16);
  await sharp(svgBuffer).resize(32, 32).png().toFile(tmp32);
  await sharp(svgBuffer).resize(48, 48).png().toFile(tmp48);

  // Convertir a multi-resolución .ico usando Pillow
  const pythonCmd = `/root/polis/backend/.venv/bin/python3 -c "
from PIL import Image
img16 = Image.open('${tmp16}')
img32 = Image.open('${tmp32}')
img48 = Image.open('${tmp48}')
img48.save('${path.join(publicDir, "favicon.ico")}', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)], append_images=[img32, img16])
img48.save('${path.join(appDir, "favicon.ico")}', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)], append_images=[img32, img16])
print('ICO multi-resolucion generado')
"`;

  execSync(pythonCmd, { stdio: "inherit" });
  console.log("  ✓ public/favicon.ico y src/app/favicon.ico generados (16, 32, 48px)");
}

main().catch((err) => {
  console.error("Error generando favicons:", err);
  process.exit(1);
});
