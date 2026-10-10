import { expect, test } from "./fixtures/mock-api";

// Regressão: com o admin logado o cabeçalho tem mais itens; eles quebravam para a linha de baixo.
const WIDTHS = [800, 992, 1100, 1280, 1365];

for (const language of ["pt-BR", "en"] as const) {
  test.describe(`cabeçalho do admin em ${language}`, () => {
    test.use({ locale: language });

    for (const width of WIDTHS) {
      test(`fica em uma linha com ${width}px de largura`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto("login");
        await page.locator("input").first().fill("emilys");
        await page.locator('input[type="password"]').fill("emilyspass");
        await page.locator("form button[type=submit]").click();
        await expect(page).toHaveURL(/\/admin$/);

        const header = page.locator("header").first();
        const box = (await header.boundingBox())!;
        const items = header.locator("a:visible, button:visible");
        const count = await items.count();
        expect(count).toBeGreaterThan(4);
        for (let i = 0; i < count; i++) {
          const b = (await items.nth(i).boundingBox())!;
          // todos dentro da faixa de 64px do cabeçalho e da largura da janela
          expect(b.y + b.height, `item ${i}`).toBeLessThanOrEqual(box.y + box.height);
          expect(b.x + b.width, `item ${i}`).toBeLessThanOrEqual(width);
        }
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        );
        expect(overflow).toBe(false);
      });
    }
  });
}
