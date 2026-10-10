import { expect, test } from "./fixtures/mock-api";

test.describe("autenticação", () => {
  test("bloqueia /admin sem login e redireciona de volta após entrar", async ({ page }) => {
    await page.goto("admin/produtos");
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Usuário").fill("emilys");
    await page.getByLabel("Senha").fill("emilyspass");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/admin\/produtos$/);
    await expect(page.getByRole("heading", { name: "Gerenciar produtos", level: 1 })).toBeVisible();
  });

  test("mostra erro com credenciais inválidas e permite logout", async ({ page }) => {
    await page.goto("login");
    await page.getByLabel("Usuário").fill("emilys");
    await page.getByLabel("Senha").fill("senhaerrada");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Usuário ou senha inválidos").first()).toBeVisible();

    await page.getByLabel("Senha").fill("emilyspass");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();

    await page.getByRole("button", { name: "Menu do usuário" }).click();
    await page.getByRole("menuitem", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("admin");
    await expect(page).toHaveURL(/\/login$/);
  });
});
