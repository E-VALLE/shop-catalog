import { expect, test } from "../fixtures/mock-api";

// Regressão visual do checkout (etapa de pagamento com o cartão selecionado), em claro e escuro.
// Sessão e carrinho são semeados no navegador: a captura não depende do fluxo de login.
for (const scheme of ["light", "dark"] as const) {
  test(`checkout: pagamento (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.addInitScript(() => {
      localStorage.setItem("shop-catalog:token", "mock-customer-token");
      localStorage.setItem(
        "shop-catalog:user",
        JSON.stringify({
          id: 16,
          username: "averyp",
          firstName: "Avery",
          lastName: "Perez",
          role: "user",
        }),
      );
      localStorage.setItem(
        "shop-catalog:cart",
        JSON.stringify([
          { id: 1, title: "Mouse sem fio", price: 120, thumbnail: "t.png", quantity: 2 },
        ]),
      );
    });
    await page.goto("checkout");
    await expect(page.getByText("Não pedimos os dados do seu cartão.")).toBeVisible();
    await expect(page.getByText("Desconto no")).toHaveCount(0);
    // espera a cotação chegar: a captura precisa estar em reais
    await expect(page.getByRole("complementary", { name: "Resumo do pedido" })).toContainText("R$");
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`checkout-${scheme}.png`, {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });
}
