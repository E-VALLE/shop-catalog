import { expect, test } from "./fixtures/mock-api";

test.describe("atalhos de categoria e marca nos detalhes", () => {
  test("clicar na categoria volta ao catálogo filtrado", async ({ page }) => {
    await page.goto("produtos/37"); // móveis (Oak Chair 1), marca Acme
    await expect(page.getByRole("heading", { level: 1, name: "Oak Chair 1" })).toBeVisible();

    await page
      .getByRole("link", { name: /Ver mais produtos da categoria/ })
      .first()
      .click();

    await expect(page).toHaveURL(/\/produtos\?categoria=furniture$/);
    await expect(page.getByRole("combobox", { name: "Categoria" })).toHaveValue("Móveis");
    const cards = page.getByRole("article");
    await expect(cards).toHaveCount(12);
    await expect(
      cards.first().getByRole("link", { name: /Ver mais produtos da categoria Móveis/ }),
    ).toBeVisible();
  });

  test("clicar na marca filtra por marca dentro da categoria e permite remover o filtro", async ({
    page,
  }) => {
    await page.goto("produtos/37");
    await page
      .getByRole("link", { name: /Ver produtos da marca Acme/ })
      .first()
      .click();

    await expect(page).toHaveURL(/categoria=furniture&marca=Acme/);
    await expect(page.getByText("Marca: Acme")).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(2); // 2 produtos Acme em móveis

    await page.getByRole("button", { name: "Remover filtro de marca Acme" }).click();
    await expect(page).not.toHaveURL(/marca=/);
    await expect(page.getByRole("article")).toHaveCount(12);
  });

  test("breadcrumb leva de volta à categoria", async ({ page }) => {
    await page.goto("produtos/1");
    const breadcrumb = page.getByRole("navigation", { name: "Navegação estrutural" });
    await breadcrumb.getByRole("link", { name: "Beleza" }).click();
    await expect(page).toHaveURL(/categoria=beauty/);
  });
});

test("clicar na imagem do produto abre os detalhes, como o botão Detalhes", async ({ page }) => {
  await page.goto("produtos");
  const card = page.getByRole("article").first();
  const title = await card.getByRole("heading", { level: 2 }).innerText();
  await card.locator("img").click();

  await expect(page).toHaveURL(/\/produtos\/\d+$/);
  await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
});

test("no carrinho, miniatura e título levam aos detalhes do produto", async ({ page }) => {
  await page.goto("produtos");
  const card = page.getByRole("article").first();
  const title = await card.getByRole("heading", { level: 2 }).innerText();
  await card.getByRole("button", { name: /Adicionar .* ao carrinho/ }).click();

  await page.goto("carrinho");
  const item = page.getByRole("article", { name: title, exact: true });
  await item.locator("img").click();
  await expect(page).toHaveURL(/\/produtos\/\d+$/);
  await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();

  await page.goto("carrinho");
  await item.getByRole("link", { name: title, exact: true }).click();
  await expect(page).toHaveURL(/\/produtos\/\d+$/);
});
