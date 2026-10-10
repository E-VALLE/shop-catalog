// Gera os ícones PNG do PWA a partir de public/icon.svg (usa o Chromium do Playwright).
import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const publicFile = (name) => fileURLToPath(new URL(`../public/${name}`, import.meta.url));

const svg = await readFile(publicFile("icon.svg"), "utf8");
const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL });
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  await page.screenshot({ path: publicFile(`icon-${size}.png`) });
  await page.close();
}
await browser.close();
