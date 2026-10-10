import { expect, test } from "./fixtures/mock-api";

test("finalizar compra sem login pede autenticação e mantém o carrinho", async ({ page }) => {
  await page.goto("produtos");
  const card = page.getByRole("article").first();
  const title = await card.getByRole("heading", { level: 2 }).innerText();
  await card.getByRole("button", { name: /Adicionar .* ao carrinho/ }).click();

  await page
    .getByRole("link", { name: /Carrinho/ })
    .first()
    .click();
  await expect(page.getByRole("article", { name: title, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Finalizar compra" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Entrar para finalizar a compra", level: 1 }),
  ).toBeVisible();

  await page.getByLabel("Usuário").fill("emilys");
  await page.getByLabel("Senha").fill("emilyspass");
  await page.getByRole("button", { name: "Entrar" }).click();

  // depois do login, vai direto para o checkout com o carrinho intacto
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("heading", { name: "Finalizar compra", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Continuar para a revisão" }).click();
  await expect(page.getByText(title)).toBeVisible();
  await page.getByRole("button", { name: "Confirmar pedido (simulado)" }).click();
  await expect(page.getByRole("heading", { name: "Pedido simulado realizado" })).toBeVisible();

  await page.goto("carrinho");
  await expect(page.getByText("Seu carrinho está vazio")).toBeVisible();
});
