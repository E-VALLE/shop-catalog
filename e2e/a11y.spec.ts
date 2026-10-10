import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures/mock-api";

/** Falha com a lista legível de violações WCAG 2.x A/AA (inclui contraste). */
async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const summary = violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.nodes.length} elemento(s), ex.: ${v.nodes[0]?.target.join(" ")}`,
  );
  expect(summary, summary.join("\n")).toEqual([]);
}

async function signIn(page: Page) {
  await page.goto("login");
  await page.getByLabel("Usuário").fill("emilys");
  await page.getByLabel("Senha").fill("emilyspass");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test.describe("acessibilidade (axe, WCAG 2.1 A/AA)", () => {
  test.use({ colorScheme: "light" });

  test("Home", async ({ page }) => {
    await page.goto("");
    await expect(page.getByRole("article").first()).toBeVisible();
    await expectNoViolations(page);
  });

  test("Catálogo, com produtos, selos e filtros", async ({ page }) => {
    await page.goto("produtos");
    await expect(page.getByRole("article")).toHaveCount(12);
    await expectNoViolations(page);
  });

  test("Detalhes do produto", async ({ page }) => {
    await page.goto("produtos/1");
    await expect(page.getByRole("heading", { level: 1, name: "Essence Mascara 1" })).toBeVisible();
    await expectNoViolations(page);
  });

  test("Carrinho com itens", async ({ page }) => {
    await page.goto("produtos");
    await page.getByRole("button", { name: /Adicionar Essence Mascara 3 ao carrinho/ }).click();
    await page.goto("carrinho");
    await expect(page.getByRole("article", { name: "Essence Mascara 3" })).toBeVisible();
    await expectNoViolations(page);
  });

  test("Favoritos", async ({ page }) => {
    await page.goto("produtos");
    await page.getByRole("button", { name: "Adicionar Essence Mascara 3 aos favoritos" }).click();
    await page.goto("favoritos");
    await expect(page.getByRole("article")).toHaveCount(1);
    await expectNoViolations(page);
  });

  test("Login", async ({ page }) => {
    await page.goto("login");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoViolations(page);
  });

  test("Área administrativa (dashboard e lista de produtos)", async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
    await expectNoViolations(page);

    await page.goto("admin/produtos");
    await expect(page.getByRole("table")).toBeVisible();
    await expectNoViolations(page);
  });

  test("Em inglês", async ({ page }) => {
    await page.goto("produtos");
    await page.getByRole("button", { name: /Idioma/ }).click();
    await page.getByRole("menuitem", { name: "English" }).click();
    await expect(page.getByRole("heading", { name: "Products", level: 1 })).toBeVisible();
    await expectNoViolations(page);
  });
});

test.describe("acessibilidade no tema escuro", () => {
  test.use({ colorScheme: "dark" });

  for (const [name, url] of [
    ["Home", ""],
    ["Catálogo", "produtos"],
    ["Detalhes", "produtos/1"],
    ["Login", "login"],
  ] as const) {
    test(name, async ({ page }) => {
      await page.goto(url);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForTimeout(500); // imagens/dados estáveis antes de medir contraste
      await expectNoViolations(page);
    });
  }
});
