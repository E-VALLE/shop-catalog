import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures/mock-api";

async function signInAndFillCart(page: Page) {
  await page.goto("login");
  await page.getByLabel("Usuário").fill("averyp");
  await page.getByLabel("Senha").fill("averyppass");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/shop-catalog\/$/);

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
  await expect(page).toHaveURL(/\/checkout$/);
}

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

const summary = (page: Page) => page.getByRole("complementary", { name: "Resumo do pedido" });

test.describe("pagamento simulado", () => {
  test("cartão: sem campos de cartão, com o motivo explicado e o nome do usuário", async ({
    page,
  }) => {
    await signInAndFillCart(page);

    await expect(page.getByText(/nenhum pagamento será processado/i)).toBeVisible();
    await expect(page.getByText("Não pedimos os dados do seu cartão.")).toBeVisible();
    await expect(page.getByText(/campo seguro do processador de pagamentos/)).toBeVisible();
    await expect(page.getByText("Avery Perez")).toBeVisible();

    // nenhuma entrada de número, validade ou CVV: só a escolha de parcelas
    for (const field of [/número/i, /validade/i, /cvv|cvc/i, /nome no cartão/i]) {
      await expect(page.getByLabel(field)).toHaveCount(0);
    }
    const textInputs = page.locator(
      "input:not([type=hidden]):not([type=radio]):not([type=checkbox])",
    );
    await expect(textInputs).toHaveCount(1);
    await expect(page.getByRole("combobox", { name: "Parcelas" })).toBeVisible();
  });

  test("Pix e boleto aplicam 5% e 3% de desconto no resumo", async ({ page }) => {
    await signInAndFillCart(page);

    await page.getByRole("radio", { name: /Pix/ }).click();
    await expect(summary(page).getByText("Desconto no Pix (5%)")).toBeVisible();
    await expect(page.getByText(/Este QR é só ilustração/)).toBeVisible();

    await page.getByRole("radio", { name: /Boleto/ }).click();
    await expect(summary(page).getByText("Desconto no Boleto (3%)")).toBeVisible();
    await expect(page.getByText("Boleto fictício: não pode ser pago.")).toBeVisible();

    await page.getByRole("radio", { name: /Cartão de crédito/ }).click();
    await expect(summary(page).getByText(/^Desconto no/)).toHaveCount(0);
  });

  test("fluxo completo com Pix até a confirmação, esvaziando o carrinho", async ({ page }) => {
    await signInAndFillCart(page);
    await page.getByRole("radio", { name: /Pix/ }).click();
    await page.getByRole("button", { name: "Continuar para a revisão" }).click();
    await expect(page.getByText(/Ao confirmar, nenhuma cobrança é feita/)).toBeVisible();

    await page.getByRole("button", { name: "Alterar" }).click();
    await expect(page.getByRole("radio", { name: /Pix/ })).toBeChecked();
    await page.getByRole("button", { name: "Continuar para a revisão" }).click();
    await page.getByRole("button", { name: "Confirmar pedido (simulado)" }).click();

    await expect(page.getByRole("heading", { name: "Pedido simulado realizado" })).toBeVisible();
    await expect(page.getByText(/^Pedido SIM-\d{5}$/)).toBeVisible();
    await expect(
      page.getByText("Nenhum pagamento foi processado e nenhum dado foi guardado."),
    ).toBeVisible();

    await page.goto("carrinho");
    await expect(page.getByText("Seu carrinho está vazio")).toBeVisible();
  });

  test("painel de pagamento e resumo têm fundos suaves, diferentes entre si e da página", async ({
    page,
  }) => {
    await signInAndFillCart(page);
    const background = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor);
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.waitForTimeout(300);
      const body = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      const summaryBg = await background("aside");
      for (const method of [/Pix/, /Cartão de crédito/, /Boleto/]) {
        await page.getByRole("radio", { name: method }).click();
        const panelBg = await background("section[aria-labelledby=payment-detail-title]");
        expect(panelBg, `${scheme} ${method}: painel x página`).not.toBe(body);
        expect(panelBg, `${scheme} ${method}: painel x resumo`).not.toBe(summaryBg);
      }
      expect(summaryBg, `${scheme}: resumo x página`).not.toBe(body);
    }
  });

  test("com o carrinho vazio, /checkout volta para o carrinho", async ({ page }) => {
    await page.goto("login");
    await page.getByLabel("Usuário").fill("averyp");
    await page.getByLabel("Senha").fill("averyppass");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/shop-catalog\/$/);
    await page.goto("checkout");
    await expect(page).toHaveURL(/\/carrinho$/);
  });

  test("visitante em /checkout vai para o login e volta ao checkout depois", async ({ page }) => {
    await page.goto("produtos");
    await page
      .getByRole("article")
      .first()
      .getByRole("button", { name: /Adicionar .* ao carrinho/ })
      .click();
    await page.goto("checkout");
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel("Usuário").fill("averyp");
    await page.getByLabel("Senha").fill("averyppass");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/checkout$/);
  });

  test("todas as etapas passam no axe em claro e escuro", async ({ page }) => {
    test.slow(); // 5 telas × 2 temas de axe
    await signInAndFillCart(page);
    const check = async () => {
      for (const scheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme: scheme });
        await page.waitForTimeout(300);
        await expectNoViolations(page);
      }
    };
    for (const name of [/Cartão de crédito/, /Pix/, /Boleto/]) {
      await page.getByRole("radio", { name }).click();
      await check();
    }
    await page.getByRole("button", { name: "Continuar para a revisão" }).click();
    await expect(page.getByText(/Ao confirmar, nenhuma cobrança é feita/)).toBeVisible();
    await check();
    await page.getByRole("button", { name: "Confirmar pedido (simulado)" }).click();
    await expect(page.getByRole("heading", { name: "Pedido simulado realizado" })).toBeVisible();
    await check();
  });
});
