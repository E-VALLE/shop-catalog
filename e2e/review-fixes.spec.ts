import { expect, test } from "./fixtures/mock-api";

// Defeitos apontados na revisão externa de 11/10/2026, cada um com um teste de regressão.

test.describe("D1: o carrinho respeita o estoque", () => {
  test("clicar várias vezes em Adicionar não passa de 3 unidades (estoque do produto 1)", async ({
    page,
  }) => {
    await page.goto("produtos/1");
    await expect(page.getByText(/Restam apenas 3/)).toBeVisible();
    const add = page.getByRole("button", { name: "Adicionar ao carrinho", exact: true });
    for (let i = 0; i < 5; i++) await add.click();

    await expect(page.getByRole("link", { name: /Carrinho,/ })).toHaveAttribute(
      "aria-label",
      /Carrinho, 3 itens/,
    );
    await expect(page.getByText("Estoque limitado").first()).toBeVisible();
  });

  test("digitar 99 na quantidade do carrinho volta ao máximo em estoque", async ({ page }) => {
    await page.goto("produtos/1");
    await page.getByRole("button", { name: "Adicionar ao carrinho", exact: true }).click();
    await page.goto("carrinho");

    const qty = page.locator('main input[aria-label*="Essence Mascara 1"]').first();
    await expect(qty).toHaveValue("1");
    await qty.fill("99");
    await qty.blur();
    await expect(qty).toHaveValue("3");
  });
});

test.describe("D2: telas de erro oferecem 'Tentar novamente'", () => {
  test("com a API falhando, o botão refaz a consulta e a lista aparece", async ({ page }) => {
    let healthy = false; // a API só "se recupera" depois que o usuário clica em Tentar novamente
    await page.route(/https:\/\/dummyjson\.com\/products(\?.*)?$/, (route) => {
      if (route.request().method() === "OPTIONS" || healthy) return route.fallback();
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({ message: "boom" }),
      });
    });
    await page.goto("produtos");
    const retry = page.getByRole("button", { name: "Tentar novamente" });
    await expect(retry).toBeVisible();
    healthy = true;
    await retry.click();
    await expect(page.getByRole("article").first()).toBeVisible();
  });
});

test.describe("D3: produto inexistente", () => {
  for (const path of ["produtos/99999", "produtos/abc"]) {
    test(`/${path} mostra mensagem em português e caminho de volta`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByText(/Produto não encontrado/).first()).toBeVisible();
      await expect(page.getByText(/not found/i)).toHaveCount(0);
      await page.getByRole("link", { name: "Ver todos os produtos" }).click();
      await expect(page).toHaveURL(/\/produtos$/);
    });
  }
});

test.describe("D4 e D5: página de login", () => {
  test("tem a região principal e 'Pular para o conteúdo' como primeiro Tab", async ({ page }) => {
    await page.goto("login");
    await expect(page.getByRole("main")).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Pular para o conteúdo" })).toBeFocused();
  });

  test("senha errada mostra um único alerta, não um por campo", async ({ page }) => {
    await page.goto("login");
    await page.getByLabel("Usuário").fill("emilys");
    await page.getByLabel("Senha").fill("senhaerrada");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Usuário ou senha inválidos")).toHaveCount(1);
  });
});
