import { expect, test } from "./fixtures/mock-api";

const awesome = { USDBRL: { bid: "5.0000", timestamp: "1790975912" } };

test.describe("moeda e categorias por idioma", () => {
  test.use({ locale: "pt-BR", timezoneId: "America/Sao_Paulo" });

  test("pt-BR mostra categorias traduzidas e preços em R$ com a cotação do dia", async ({
    page,
  }) => {
    await page.route("**/economia.awesomeapi.com.br/**", (route) =>
      route.fulfill({ json: awesome }),
    );
    await page.goto("produtos");

    const card = page.getByRole("article").first();
    await expect(card).toBeVisible();
    await expect(card.getByText(/^R\$/).first()).toBeVisible();
    await expect(card.getByText("BELEZA", { exact: false })).toBeVisible();
    await expect(page.getByText(/Valores convertidos de USD · US\$ 1 = R\$\s*5,00/)).toBeVisible();

    // ao trocar para inglês volta para USD e para os nomes em inglês
    await page.getByRole("button", { name: /Idioma/ }).click();
    await page.getByRole("menuitem", { name: "English" }).click();
    await expect(page.getByRole("article").first().getByText(/^\$/).first()).toBeVisible();
    await expect(
      page.getByRole("article").first().getByText("BEAUTY", { exact: false }),
    ).toBeVisible();
  });

  test("sem cotação disponível, exibe USD com aviso", async ({ page }) => {
    await page.route("**/economia.awesomeapi.com.br/**", (route) => route.abort());
    await page.route("**/api.frankfurter.dev/**", (route) => route.abort());
    await page.goto("produtos");
    await expect(page.getByRole("article").first().getByText(/^US\$/).first()).toBeVisible();
    await expect(page.getByText(/Cotação do dólar indisponível/)).toBeVisible();
  });
});
