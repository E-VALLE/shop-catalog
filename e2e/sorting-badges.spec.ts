import { expect, test } from "./fixtures/mock-api";

test.describe("ordenação, desconto e estoque", () => {
  test("ordena por maior preço, mantém na URL e volta à relevância ao limpar", async ({ page }) => {
    await page.goto("produtos");
    await expect(page.getByRole("article")).toHaveCount(12);
    await expect(page.getByRole("article").first()).toHaveAccessibleName("Essence Mascara 1");

    await page.getByRole("combobox", { name: "Ordenar por" }).click();
    await page.getByRole("option", { name: "Maior preço" }).click();

    await expect(page).toHaveURL(/ordem=preco-desc/);
    await expect(page.getByRole("article").first()).toHaveAccessibleName("Oak Chair 12"); // mais caro

    await page.reload(); // a escolha sobrevive ao recarregar
    await expect(page.getByRole("article").first()).toHaveAccessibleName("Oak Chair 12");
    await expect(page.getByRole("combobox", { name: "Ordenar por" })).toHaveValue("Maior preço");
  });

  test("ordenação combina com a página: volta para a 1 ao trocar", async ({ page }) => {
    await page.goto("produtos?pagina=3");
    await expect(page.getByRole("article").first()).toBeVisible();
    await page.getByRole("combobox", { name: "Ordenar por" }).click();
    await page.getByRole("option", { name: "Menor preço" }).click();
    await expect(page).toHaveURL(/ordem=preco-asc/);
    await expect(page).not.toHaveURL(/pagina=/);
  });

  test("cards mostram desconto, poucas unidades e esgotado (com compra bloqueada)", async ({
    page,
  }) => {
    await page.goto("produtos");
    const lowStock = page.getByRole("article", { name: "Essence Mascara 1", exact: true });
    await expect(lowStock.getByLabel("15% de desconto")).toHaveText("-15%");
    await expect(lowStock.getByText("Restam 3")).toBeVisible();

    const soldOut = page.getByRole("article", { name: "Essence Mascara 2", exact: true });
    await expect(soldOut.getByText("Esgotado")).toBeVisible();
    await expect(soldOut.getByRole("button", { name: /Adicionar .* ao carrinho/ })).toBeDisabled();

    const noDiscount = page.getByRole("article", { name: "Essence Mascara 3", exact: true });
    await expect(noDiscount.getByLabel(/de desconto/)).toHaveCount(0);
  });

  test("detalhes avisam poucas unidades e bloqueiam produto esgotado", async ({ page }) => {
    await page.goto("produtos/1");
    await expect(page.getByText("Restam apenas 3 unidades")).toBeVisible();
    await expect(page.getByRole("button", { name: "Adicionar ao carrinho" })).toBeEnabled();

    await page.goto("produtos/2");
    await expect(page.getByText("Esgotado")).toBeVisible();
    await expect(page.getByRole("button", { name: "Adicionar ao carrinho" })).toBeDisabled();
  });
});
