import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./fixtures/mock-api";

const css = (locator: Locator, property: string) =>
  locator.evaluate((node, prop) => getComputedStyle(node).getPropertyValue(prop), property);

const bodyBackground = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

async function signIn(page: Page) {
  await page.goto("login");
  await page.getByLabel("Usuário").fill("emilys");
  await page.getByLabel("Senha").fill("emilyspass");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`superfícies e cores (${scheme})`, () => {
    test.use({ colorScheme: scheme });

    test("cabeçalho fixo tem fundo suave diferente do da página", async ({ page }) => {
      await page.goto("produtos");
      const header = page.locator("header").first();
      await expect(header).toBeVisible();
      expect(await css(header, "background-color")).not.toBe(await bodyBackground(page));
    });

    test("favoritos e carrinho têm cores diferentes (ícone, hover e contador)", async ({
      page,
    }) => {
      await page.goto("produtos");
      await page.getByRole("button", { name: /Adicionar Essence Mascara 3 aos favoritos/ }).click();
      await page.getByRole("button", { name: /Adicionar Essence Mascara 3 ao carrinho/ }).click();

      const favorites = page.getByRole("link", { name: /Favoritos, 1 item/ });
      const cart = page.getByRole("link", { name: /Carrinho, 1 item/ });
      await expect(favorites).toBeVisible();

      // ícone
      expect(await css(favorites, "color")).not.toBe(await css(cart, "color"));

      // contador (bolinha)
      const badge = (link: Locator) =>
        page
          .locator(".mantine-Indicator-root")
          .filter({ has: link })
          .locator(".mantine-Indicator-indicator");
      expect(await css(badge(favorites), "background-color")).not.toBe(
        await css(badge(cart), "background-color"),
      );

      // hover
      await favorites.hover();
      await page.waitForTimeout(300);
      const favoritesHover = await css(favorites, "background-color");
      await cart.hover();
      await page.waitForTimeout(300);
      const cartHover = await css(cart, "background-color");
      expect(favoritesHover, "hover do favoritos tem cor própria").not.toBe(cartHover);
      expect(favoritesHover).not.toBe("rgba(0, 0, 0, 0)");
    });

    test("moldura da imagem nos detalhes tem fundo diferente do da página", async ({ page }) => {
      await page.goto("produtos/1");
      const panel = page
        .locator(".mantine-Card-root")
        .filter({ has: page.locator("img") })
        .first();
      await expect(panel).toBeVisible();
      expect(await css(panel, "background-color")).not.toBe(await bodyBackground(page));
    });

    test("hero da Home: degradê + ilustração decorativa escondida de leitores de tela", async ({
      page,
    }) => {
      await page.goto("");
      const hero = page
        .locator(".mantine-Card-root")
        .filter({ hasText: "Encontre o produto ideal" });
      await expect(hero).toBeVisible();
      expect(await css(hero, "background-image")).toContain("linear-gradient");

      const art = hero.locator("svg").first();
      await expect(art).toBeVisible();
      await expect(art.locator("xpath=..")).toHaveAttribute("aria-hidden", "true");
      // o texto continua legível e clicável por cima da ilustração
      await expect(hero.getByRole("link", { name: "Ver catálogo" })).toBeVisible();
    });

    test("hero em tela estreita: a ilustração some, o conteúdo permanece", async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 700 });
      await page.goto("");
      const hero = page
        .locator(".mantine-Card-root")
        .filter({ hasText: "Encontre o produto ideal" });
      await expect(hero.getByRole("link", { name: "Ver catálogo" })).toBeVisible();
      await expect(hero.locator("svg[viewBox='0 0 440 260']")).toBeHidden();
    });

    test("painéis do dashboard têm fundo suave diferente do da página", async ({ page }) => {
      await signIn(page);
      const body = await bodyBackground(page);
      const cards = page.locator(".mantine-Card-root");
      await expect(cards.first()).toBeVisible();
      const count = await cards.count();
      expect(count).toBeGreaterThanOrEqual(6); // 4 indicadores + 2 gráficos (+ ações rápidas)
      for (let i = 0; i < count; i++) {
        expect(await css(cards.nth(i), "background-color"), `painel ${i}`).not.toBe(body);
      }
    });
  });
}
