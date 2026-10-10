import { expect, test } from "./fixtures/mock-api";

test.describe("favoritos", () => {
  test("favoritar no card atualiza o contador, aparece em /favoritos e persiste ao recarregar", async ({
    page,
  }) => {
    await page.goto("produtos");
    const card = page.getByRole("article", { name: "Essence Mascara 3", exact: true });
    await card.getByRole("button", { name: "Adicionar Essence Mascara 3 aos favoritos" }).click();
    await expect(
      card.getByRole("button", { name: "Remover Essence Mascara 3 dos favoritos" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("link", { name: "Favoritos, 1 item" })).toBeVisible();

    await page.getByRole("link", { name: "Favoritos, 1 item" }).click();
    await expect(page).toHaveURL(/\/favoritos$/);
    await expect(page).toHaveTitle("Favoritos · Shop Catalog");
    await expect(
      page.getByRole("article", { name: "Essence Mascara 3", exact: true }),
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("article", { name: "Essence Mascara 3", exact: true }),
    ).toBeVisible();
  });

  test("favoritos mais recentes primeiro e remoção na própria página", async ({ page }) => {
    await page.goto("produtos");
    for (const n of [4, 5]) {
      await page
        .getByRole("button", { name: `Adicionar Essence Mascara ${n} aos favoritos` })
        .click();
    }
    await page.goto("favoritos");
    const articles = page.getByRole("article");
    await expect(articles).toHaveCount(2);
    await expect(articles.first()).toHaveAccessibleName("Essence Mascara 5");

    await page.getByRole("button", { name: "Remover Essence Mascara 5 dos favoritos" }).click();
    await expect(articles).toHaveCount(1);
    await page.getByRole("button", { name: "Remover Essence Mascara 4 dos favoritos" }).click();
    await expect(page.getByText("Você ainda não tem favoritos")).toBeVisible();
  });

  test("favoritar nos detalhes reflete na lista de produtos", async ({ page }) => {
    await page.goto("produtos/6");
    await page.getByRole("button", { name: "Adicionar Essence Mascara 6 aos favoritos" }).click();
    await page.goto("produtos");
    await expect(
      page.getByRole("button", { name: "Remover Essence Mascara 6 dos favoritos" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("galeria de imagens", () => {
  test("miniaturas trocam a imagem principal", async ({ page }) => {
    await page.goto("produtos/1");
    const main = page.locator("img[alt='Essence Mascara 1']");
    const firstSrc = await main.getAttribute("src");

    await expect(page.getByRole("group", { name: "Imagens do produto" })).toBeVisible();
    await page.getByRole("button", { name: "Ver imagem 3 de 3" }).click();

    await expect(page.getByRole("button", { name: "Ver imagem 3 de 3" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(main).not.toHaveAttribute("src", firstSrc ?? "");
  });
});
