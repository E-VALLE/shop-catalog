import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures/mock-api";

const cases = [
  { scheme: "light", locale: "pt-BR", phrase: "removido do carrinho", undo: "Desfazer" },
  { scheme: "dark", locale: "pt-BR", phrase: "removido do carrinho", undo: "Desfazer" },
  { scheme: "light", locale: "en-US", phrase: "removed from the cart", undo: "Undo" },
  { scheme: "dark", locale: "en-US", phrase: "removed from the cart", undo: "Undo" },
] as const;

async function removeFirstItem(page: Page, addLabel: RegExp, removeLabel: RegExp) {
  await page.goto("produtos");
  await page.getByRole("button", { name: addLabel }).first().click();
  await page.goto("carrinho");
  await page.getByRole("button", { name: removeLabel }).first().click();
}

for (const { scheme, locale, phrase, undo } of cases) {
  test.describe(`notificação de remoção: ${scheme} / ${locale}`, () => {
    test.use({ colorScheme: scheme, locale });

    test("tem fundo e frase em destaque diferentes do restante da página", async ({ page }) => {
      await removeFirstItem(page, /Adicionar .* ao carrinho|Add .* to cart/, /Remover|Remove /);

      const alert = page.getByRole("alert");
      await expect(alert).toBeVisible();
      await expect(alert).toContainText(phrase);

      const styles = await alert.evaluate((node, text) => {
        const highlight = [...node.querySelectorAll("span")].find((el) => el.textContent === text)!;
        const bodyBg = getComputedStyle(document.body).backgroundColor;
        const bold = Number(getComputedStyle(highlight).fontWeight);
        return {
          alertBg: getComputedStyle(node).backgroundColor,
          bodyBg,
          bold,
          highlightColor: getComputedStyle(highlight).color,
          textColor: getComputedStyle(highlight.parentElement!).color,
        };
      }, phrase);

      expect(styles.alertBg, "fundo da notificação ≠ fundo da página").not.toBe(styles.bodyBg);
      expect(styles.bold).toBeGreaterThanOrEqual(700);
      expect(styles.highlightColor, "frase com cor própria").not.toBe(styles.textColor);
    });

    test("o botão e o texto passam no axe (contraste WCAG AA)", async ({ page }) => {
      await removeFirstItem(page, /Adicionar .* ao carrinho|Add .* to cart/, /Remover|Remove /);
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page.getByRole("button", { name: undo })).toBeVisible();
      await page.waitForTimeout(500); // fim da animação de entrada

      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const summary = violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`);
      expect(summary, summary.join("\n")).toEqual([]);
    });
  });
}
