import { expect, test } from "./fixtures/mock-api";

const b64url = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt = (exp: number) => `${b64url({ alg: "HS256" })}.${b64url({ exp })}.assinatura`;
const user = { id: 1, username: "emilys", firstName: "Emily", lastName: "Johnson", role: "admin" };

/** Simula uma sessão salva de uma visita anterior. */
async function seedSession(page: import("@playwright/test").Page, token: string) {
  await page.addInitScript(
    ([storedToken, storedUser]) => {
      localStorage.setItem("shop-catalog:token", storedToken);
      localStorage.setItem("shop-catalog:user", storedUser);
    },
    [token, JSON.stringify(user)],
  );
}

test.describe("expiração da sessão (JWT)", () => {
  test("token já expirado: o acesso ao admin é bloqueado e a sessão é limpa", async ({ page }) => {
    await seedSession(page, jwt(Math.floor(Date.now() / 1000) - 60));
    await page.goto("admin");
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem("shop-catalog:token"))).toBeNull();
  });

  test("token ainda válido: a sessão é restaurada", async ({ page }) => {
    await seedSession(page, jwt(Math.floor(Date.now() / 1000) + 3600));
    await page.goto("admin");
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
  });

  test("a sessão termina sozinha quando o prazo do token acaba, com aviso", async ({ page }) => {
    await seedSession(page, jwt(Math.floor(Date.now() / 1000) + 3));
    await page.goto("admin");
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();

    await expect(page.getByText("Sua sessão expirou. Entre novamente.")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page).toHaveURL(/\/login$/);
  });

  test("sessão salva sem papel (versão anterior) vale como cliente e é barrada em /admin", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("shop-catalog:token", "mock-access-token");
      localStorage.setItem(
        "shop-catalog:user",
        JSON.stringify({ id: 1, username: "emilys", firstName: "Emily", lastName: "Johnson" }),
      );
    });
    await page.goto("admin");
    await expect(page.getByRole("heading", { name: "Acesso restrito", level: 1 })).toBeVisible();
  });

  test("dados salvos corrompidos não derrubam o app: volta ao login", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("shop-catalog:token", "mock-access-token");
      localStorage.setItem("shop-catalog:user", "{corrompido");
    });
    await page.goto("admin");
    await expect(page).toHaveURL(/\/login$/);
  });
});
