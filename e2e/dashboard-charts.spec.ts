import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures/mock-api";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("login");
  await page.getByLabel("Usuário").fill("emilys");
  await page.getByLabel("Senha").fill("emilyspass");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
}

test.describe("dashboard: gráficos", () => {
  test("desenha as barras por categoria e o donut do estoque", async ({ page }) => {
    await signIn(page);

    const categories = page.getByRole("img", { name: /Produtos por categoria \(top 10\)/ });
    await expect(categories).toBeVisible();
    await expect(categories).toHaveAccessibleName(/Beleza: 12/);
    // o SVG do gráfico precisa ter de fato desenhado as barras (não só o contêiner)
    await expect(categories.locator(".recharts-bar-rectangle").first()).toBeVisible();
    expect(await categories.locator(".recharts-bar-rectangle").count()).toBe(4); // 4 categorias no mock

    const stock = page.getByRole("img", { name: /Situação do estoque/ });
    await expect(stock.locator("svg path").first()).toBeVisible();
    await expect(stock).toHaveAccessibleName(
      /Em estoque: 46, Poucas unidades \(≤5\): 1, Esgotado: 1/,
    );
    await expect(page.getByRole("listitem").filter({ hasText: "Esgotado: 1" })).toBeVisible();
  });

  test("o indicador de estoque baixo bate com o gráfico e os textos acompanham o idioma", async ({
    page,
  }) => {
    await signIn(page);
    await expect(page.getByText("Estoque baixo (≤5)")).toBeVisible();

    await page.getByRole("button", { name: /Idioma/ }).click();
    await page.getByRole("menuitem", { name: "English" }).click();
    await expect(page.getByRole("img", { name: /Products per category \(top 10\)/ })).toBeVisible();
    await expect(page.getByRole("img", { name: /Stock status/ })).toHaveAccessibleName(
      /In stock: 46/,
    );
  });

  test("acessível: sem violações do axe com os gráficos (claro e escuro)", async ({ page }) => {
    await signIn(page);
    await expect(page.locator(".recharts-bar-rectangle").first()).toBeVisible();
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.waitForTimeout(400);
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const summary = violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")} (${scheme})`);
      expect(summary, summary.join("\n")).toEqual([]);
    }
  });
});
