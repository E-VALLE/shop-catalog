import { expect, test } from "./fixtures/mock-api";

test.describe("catálogo e carrinho", () => {
  test("busca, abre detalhes e adiciona ao carrinho", async ({ page }) => {
    await page.goto("produtos");
    await page.getByRole("searchbox", { name: "Buscar produtos" }).fill("phone");
    await expect(page).toHaveURL(/q=phone/); // busca aplicada após o debounce

    const card = page.getByRole("article").first();
    // espera o resultado da busca substituir a lista anterior (senão o título lido seria de outro produto)
    await expect(card.getByRole("heading", { level: 2 })).toContainText(/phone/i);
    const title = await card.getByRole("heading", { level: 2 }).innerText();
    await card.getByRole("link", { name: "Detalhes" }).click();

    // a página de detalhes é carregada sob demanda (lazy): espere o título do produto
    await expect(page).toHaveURL(/\/produtos\/\d+$/);
    await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();

    await page
      .getByRole("link", { name: /Carrinho/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/carrinho$/);
    await expect(page.getByRole("article", { name: title, exact: true })).toBeVisible();
  });

  test("pagina o catálogo e mantém a página na URL", async ({ page }) => {
    await page.goto("produtos");
    await expect(page.getByRole("article").first()).toBeVisible();
    await page.getByRole("button", { name: "2", exact: true }).click();
    await expect(page).toHaveURL(/pagina=2/);
    await page.reload();
    await expect(page.getByRole("article").first()).toBeVisible();
  });

  test("link direto para detalhes funciona e id inválido mostra erro", async ({ page }) => {
    await page.goto("produtos/1");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.goto("produtos/abc");
    await expect(page.getByText("Identificador de produto inválido.")).toBeHidden();
    await expect(page.getByText(/Produto não encontrado/).first()).toBeVisible();
  });
});
