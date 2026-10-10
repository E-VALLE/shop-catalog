import { expect, test } from "./fixtures/mock-api";

// Regressão: ao abrir "Detalhes" a partir de uma lista rolada, a página nova abria rolada para
// o meio (avaliações/relacionados) em vez do topo, porque o React Router não restaura a rolagem.
test.describe("rolagem ao navegar", () => {
  for (const viewport of [
    { name: "celular", width: 393, height: 852 },
    { name: "desktop", width: 1280, height: 800 },
  ]) {
    test(`abrir Detalhes de uma lista rolada começa no topo (${viewport.name})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("produtos");
      await expect(page.getByRole("article").first()).toBeVisible();

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);

      const lastCard = page.getByRole("article").last();
      await lastCard.getByRole("link", { name: "Detalhes" }).click();
      await expect(page).toHaveURL(/\/produtos\/\d+$/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 3000 }).toBe(0);
      await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
    });
  }
});
