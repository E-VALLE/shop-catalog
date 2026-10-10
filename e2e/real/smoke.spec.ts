import { expect, test } from "@playwright/test";

// Único teste contra a DummyJSON de verdade (yarn e2e:real): detecta quebra de contrato da API.
test("smoke com a API real: lista produtos e autentica", async ({ page }) => {
  await page.goto("produtos");
  await expect(page.getByRole("article").first()).toBeVisible();

  await page.goto("login");
  await page.getByLabel("Usuário").fill("emilys");
  await page.getByLabel("Senha").fill("emilyspass");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
});
