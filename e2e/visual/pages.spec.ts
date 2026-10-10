import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures/mock-api";

// Regressão visual: rode `yarn e2e:visual`; após uma mudança de design intencional,
// `yarn e2e:visual:update` e revise as imagens alteradas em e2e/visual/pages.spec.ts-snapshots.
const PAGES = [
  { name: "inicio", path: "", ready: "heading", title: /Encontre o produto ideal/ },
  { name: "produtos", path: "produtos", ready: "heading", title: /^Produtos$/ },
  { name: "carrinho-vazio", path: "carrinho", ready: "heading", title: /Carrinho/ },
  { name: "entrar", path: "login", ready: "heading", title: /^Entrar$/ },
] as const;

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  // imagens do mock: espera terminarem para a captura não pegar placeholders pela metade
  await expect
    .poll(() => page.evaluate(() => [...document.images].every((img) => img.complete)))
    .toBe(true);
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`visual (${scheme})`, () => {
    test.use({ colorScheme: scheme });

    for (const { name, path, title } of PAGES) {
      test(`${name}`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole("heading", { name: title }).first()).toBeVisible();
        await settle(page);
        await expect(page).toHaveScreenshot(`${name}-${scheme}.png`, {
          animations: "disabled",
          maxDiffPixelRatio: 0.01,
        });
      });
    }
  });
}
