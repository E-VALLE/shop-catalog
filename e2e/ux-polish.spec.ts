import { expect, test } from "./fixtures/mock-api";

test.describe("polimento de UX", () => {
  test("título da aba muda por rota e acompanha o idioma", async ({ page }) => {
    await page.goto("");
    await expect(page).toHaveTitle("Início · Shop Catalog");

    await page.goto("produtos?categoria=furniture");
    await expect(page).toHaveTitle("Móveis · Produtos · Shop Catalog");

    await page.goto("produtos/1");
    await expect(page.getByRole("heading", { level: 1, name: "Essence Mascara 1" })).toBeVisible();
    await expect(page).toHaveTitle("Essence Mascara 1 · Shop Catalog");

    await page.goto("carrinho");
    await expect(page).toHaveTitle("Carrinho · Shop Catalog");

    await page.getByRole("button", { name: /Idioma/ }).click();
    await page.getByRole("menuitem", { name: "English" }).click();
    await expect(page).toHaveTitle("Cart · Shop Catalog");
  });

  test("mostra skeletons enquanto a lista carrega e os substitui pelos produtos", async ({
    page,
  }) => {
    await page.route(/dummyjson\.com\/products\?/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fallback(); // segue para o mock padrão
    });
    await page.goto("produtos");

    const loading = page.getByRole("status", { name: "Carregando produtos..." });
    await expect(loading).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(12);
    await expect(loading).toBeHidden();
  });

  test("ao paginar, volta ao topo e foca o título", async ({ page }) => {
    await page.goto("produtos");
    await expect(page.getByRole("article")).toHaveCount(12);

    await page.getByRole("button", { name: "2", exact: true }).scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(200);

    await page.getByRole("button", { name: "2", exact: true }).click();
    await expect(page).toHaveURL(/pagina=2/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
    await expect(page.getByRole("heading", { level: 1, name: "Produtos" })).toBeFocused();
  });

  test("imagens dos cards usam carregamento preguiçoso", async ({ page }) => {
    await page.goto("produtos");
    const images = page.getByRole("article").first().locator("img");
    await expect(images).toHaveAttribute("loading", "lazy");
  });
});
