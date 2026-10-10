import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures/mock-api";

async function signIn(page: Page, username: string, password: string) {
  await page.goto("login");
  await page.getByLabel("Usuário").fill(username);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

const adminLinks = (page: Page) =>
  page
    .getByRole("navigation", { name: "Principal" })
    .getByRole("link", { name: /Dashboard|Gerenciar produtos/ });

test.describe("tela de login com contas de demonstração", () => {
  test("mostra as duas contas e o aviso de que não há cadastro", async ({ page }) => {
    await page.goto("login");
    await expect(page.getByRole("heading", { name: "Entrar", level: 1 })).toBeVisible();
    await expect(page.getByText("Demonstração", { exact: true })).toBeVisible();
    await expect(page.getByText(/Acesso administrativo:/)).toContainText(
      "emilys / senha emilyspass",
    );
    await expect(page.getByText(/Cliente com cadastro:/)).toContainText(
      "averyp / senha averyppass",
    );
    await expect(page.getByText(/não implementamos porque a DummyJSON não persiste/)).toBeVisible();
  });

  test("passa no axe em claro e escuro", async ({ page }) => {
    await page.goto("login");
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.waitForTimeout(300);
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
    }
  });
});

test.describe("administrador", () => {
  test("entra no painel e vê os links de administração", async ({ page }) => {
    await signIn(page, "emilys", "emilyspass");
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
    await expect(adminLinks(page)).toHaveCount(2);
  });
});

test.describe("cliente", () => {
  test("entra na loja, não vê links de administração e é barrado em /admin", async ({ page }) => {
    await signIn(page, "averyp", "averyppass");
    await expect(page).toHaveURL(/\/shop-catalog\/$/);
    await expect(adminLinks(page)).toHaveCount(0);

    await page.getByRole("button", { name: "Menu do usuário" }).click();
    await expect(page.getByRole("menuitem", { name: "Sair" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Administração" })).toHaveCount(0);
    await page.keyboard.press("Escape");

    for (const path of ["admin", "admin/produtos", "admin/produtos/novo"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "Acesso restrito", level: 1 })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Dashboard" })).toHaveCount(0);
    }
    await page.getByRole("link", { name: "Voltar para a loja" }).click();
    await expect(page).toHaveURL(/\/shop-catalog\/$/);
  });

  test("a página Acesso restrito passa no axe em claro e escuro", async ({ page }) => {
    await signIn(page, "averyp", "averyppass");
    // espera o login terminar (o papel é consultado depois): navegar antes perderia a sessão
    await expect(page).toHaveURL(/\/shop-catalog\/$/);
    await page.goto("admin");
    await expect(page.getByRole("heading", { name: "Acesso restrito" })).toBeVisible();
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.waitForTimeout(300);
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
    }
  });

  test("tentar /admin sem sessão, entrar como cliente e ver Acesso restrito", async ({ page }) => {
    await page.goto("admin");
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel("Usuário").fill("averyp");
    await page.getByLabel("Senha").fill("averyppass");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Acesso restrito", level: 1 })).toBeVisible();
  });

  test("finalizar compra: login como cliente leva direto ao checkout", async ({ page }) => {
    await page.goto("produtos");
    await page
      .getByRole("article")
      .first()
      .getByRole("button", { name: /Adicionar .* ao carrinho/ })
      .click();
    await page
      .getByRole("link", { name: /Carrinho/ })
      .first()
      .click();
    await page.getByRole("button", { name: "Finalizar compra" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Usuário").fill("averyp");
    await page.getByLabel("Senha").fill("averyppass");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByRole("heading", { name: "Finalizar compra", level: 1 })).toBeVisible();
  });
});

test.describe("falha ao consultar o papel", () => {
  test("se /auth/me falha, nem a emilys vira admin (padrão seguro: cliente)", async ({ page }) => {
    await page.route("https://dummyjson.com/auth/me", (route) =>
      route.request().method() === "OPTIONS"
        ? route.fallback() // preflight de CORS segue para o mock padrão
        : route.fulfill({
            status: 500,
            contentType: "application/json",
            headers: { "access-control-allow-origin": "*" },
            body: JSON.stringify({ message: "boom" }),
          }),
    );
    await signIn(page, "emilys", "emilyspass");
    await expect(page).toHaveURL(/\/shop-catalog\/$/);
    await expect(adminLinks(page)).toHaveCount(0);
    // sem notificação de erro: a consulta do papel falha em silêncio
    await expect(page.getByText("Erro na requisição")).toHaveCount(0);
  });
});
