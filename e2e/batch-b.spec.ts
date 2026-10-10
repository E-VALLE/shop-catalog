import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures/mock-api";

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const summary = violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`);
  expect(summary, summary.join("\n")).toEqual([]);
}

test.describe("comparar produtos", () => {
  test("marca até 3, bloqueia o 4º e compara lado a lado com destaques em texto", async ({
    page,
  }) => {
    await page.goto("produtos");
    for (const n of [3, 4, 5]) {
      await page.getByRole("button", { name: `Comparar Essence Mascara ${n}` }).click();
    }
    const bar = page.getByRole("complementary", { name: "Produtos selecionados para comparação" });
    await expect(bar).toContainText("3 produtos selecionados (máx. 3)");

    await page.getByRole("button", { name: "Comparar Essence Mascara 6" }).click();
    await expect(page.getByText("Você pode comparar no máximo 3 produtos.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Comparar Essence Mascara 6" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await bar.getByRole("link", { name: "Comparar" }).click();
    await expect(page).toHaveURL(/\/comparar$/);
    await expect(page).toHaveTitle("Comparar produtos · Shop Catalog");

    const table = page.getByRole("table", { name: "Comparar produtos" });
    await expect(table.getByRole("columnheader")).toHaveCount(4);
    await expect(table.getByText("Menor preço")).toHaveCount(1);
    await expect(table.getByText("Melhor avaliação").first()).toBeVisible();
    // a barra some na própria tela de comparação
    await expect(bar).toHaveCount(0);
  });

  test("remover uma coluna e comprar pela tabela; a seleção persiste ao recarregar", async ({
    page,
  }) => {
    await page.goto("produtos");
    await page.getByRole("button", { name: "Comparar Essence Mascara 3" }).click();
    await page.getByRole("button", { name: "Comparar Essence Mascara 4" }).click();
    await page.goto("comparar");
    await expect(page.getByRole("table")).toBeVisible();

    await page.getByRole("button", { name: "Adicionar Essence Mascara 3 ao carrinho" }).click();
    await expect(page.getByRole("link", { name: "Carrinho, 1 item" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("columnheader")).toHaveCount(3);
    await page.getByRole("button", { name: "Remover Essence Mascara 4 da comparação" }).click();
    await expect(page.getByRole("status")).toContainText("Marque pelo menos mais um produto");
  });

  test("acessível (claro e escuro)", async ({ page }) => {
    await page.goto("produtos");
    await page.getByRole("button", { name: "Comparar Essence Mascara 3" }).click();
    await page.getByRole("button", { name: "Comparar Essence Mascara 4" }).click();
    await page.goto("comparar");
    await expect(page.getByRole("table")).toBeVisible();
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.waitForTimeout(300);
      await expectNoViolations(page);
    }
  });
});

test.describe("filtros avançados", () => {
  test("avaliação mínima + só em estoque filtram e ficam na URL; limpar volta ao normal", async ({
    page,
  }) => {
    await page.goto("produtos");
    await expect(page.getByRole("article")).toHaveCount(12);

    await page.getByRole("button", { name: "Filtros" }).click();
    await page.getByRole("combobox", { name: "Avaliação mínima" }).click();
    await page.getByRole("option", { name: "4 estrelas ou mais" }).click();
    await expect(page).toHaveURL(/nota=4/);
    // no mock, só 1 a cada 3 produtos tem nota 4,4
    await expect(page.getByText("16 produtos encontrados")).toBeVisible();

    await page.getByRole("switch", { name: "Somente em estoque" }).click();
    await expect(page).toHaveURL(/estoque=1/);
    await expect(page.getByRole("button", { name: "Filtros (2)" })).toBeVisible();

    await page.reload(); // sobrevive ao recarregar, com o painel aberto
    await expect(page.getByRole("button", { name: "Filtros (2)" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    await page.getByRole("button", { name: "Limpar filtros" }).click();
    await expect(page).not.toHaveURL(/nota=|estoque=/);
    await expect(page.getByText("48 produtos encontrados")).toBeVisible();
  });

  test("faixa de preço pelo teclado: o limite mínimo vai para a URL", async ({ page }) => {
    await page.goto("produtos");
    await page.getByRole("button", { name: "Filtros" }).click();
    const minThumb = page.getByRole("slider", { name: "Preço mínimo" });
    await minThumb.focus();
    for (let i = 0; i < 40; i++) await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(/precoMin=\d+/);
    await expect(page.getByRole("button", { name: "Filtros (1)" })).toBeVisible();
    await expect(page.getByText(/produtos encontrados/)).toBeVisible();
  });

  test("filtros abertos passam no axe", async ({ page }) => {
    await page.goto("produtos?nota=4&estoque=1");
    await expect(page.getByRole("region", { name: "Filtros avançados" })).toBeVisible();
    await expect(page.getByRole("article").first()).toBeVisible();
    await expectNoViolations(page);
  });
});

test.describe("avaliações e relacionados", () => {
  test("mostra média, 3 avaliações e expande; produtos relacionados sem o próprio", async ({
    page,
  }) => {
    await page.goto("produtos/1");
    await expect(page.getByRole("heading", { name: "Avaliações (5)", level: 2 })).toBeVisible();
    const reviews = page.getByRole("region", { name: /Avaliações/ });
    await expect(reviews.getByRole("listitem")).toHaveCount(3);

    await reviews.getByRole("button", { name: "Ver todas as 5 avaliações" }).click();
    await expect(reviews.getByRole("listitem")).toHaveCount(5);
    await expect(reviews.getByText("23 de mai. de 2025").first()).toBeVisible();

    const related = page.getByRole("region", { name: "Produtos relacionados" });
    await expect(related.getByRole("article")).toHaveCount(4);
    await expect(
      related.getByRole("article", { name: "Essence Mascara 1", exact: true }),
    ).toHaveCount(0);
    await expect(related.getByRole("article").first()).toHaveAccessibleName("Essence Mascara 2"); // mesma marca (Acme) primeiro
  });

  test("sem avaliações mostra a mensagem; página passa no axe", async ({ page }) => {
    await page.goto("produtos/2");
    await expect(page.getByText("Este produto ainda não tem avaliações.")).toBeVisible();
    await expectNoViolations(page);
    await page.goto("produtos/1");
    await expect(page.getByRole("heading", { name: "Avaliações (5)" })).toBeVisible();
    await expectNoViolations(page);
  });
});

test.describe("resumo do pedido e cupom", () => {
  test("mostra frete, aplica o cupom BEMVINDO10 e leva o total à confirmação da compra", async ({
    page,
  }) => {
    await page.goto("produtos");
    await page.getByRole("button", { name: "Adicionar Essence Mascara 3 ao carrinho" }).click();
    await page.goto("carrinho");

    const summary = page.getByRole("region", { name: "Resumo do pedido" });
    await expect(summary.getByText("Frete", { exact: true }).locator("..")).toContainText(
      "R$ 29,95",
    ); // 5,99 × 5
    await expect(summary.getByText(/Faltam R\$.* para o frete grátis/)).toBeVisible();

    await summary.getByLabel("Cupom de desconto").fill("bemvindo10");
    await summary.getByRole("button", { name: "Aplicar" }).click();
    await expect(summary.getByText(/Cupom BEMVINDO10/)).toBeVisible();

    await summary.getByLabel("Cupom de desconto").fill("NAOEXISTE");
    await summary.getByRole("button", { name: "Aplicar" }).click();
    await expect(summary.getByText("Cupom inválido")).toBeVisible();

    await page.reload(); // o cupom aplicado persiste
    await expect(
      page.getByRole("region", { name: "Resumo do pedido" }).getByText(/Cupom BEMVINDO10/),
    ).toBeVisible();
  });

  test("com valor acima do mínimo o frete é grátis e o resumo passa no axe", async ({ page }) => {
    await page.goto("produtos");
    const card = page.getByRole("article", { name: "Essence Mascara 3", exact: true });
    await card.getByRole("button", { name: "Adicionar Essence Mascara 3 ao carrinho" }).click();
    for (let i = 0; i < 5; i++) {
      await card.getByRole("button", { name: "Aumentar quantidade de Essence Mascara 3" }).click();
    }
    await page.goto("carrinho");
    const summary = page.getByRole("region", { name: "Resumo do pedido" });
    await expect(summary.getByText("Você ganhou frete grátis!")).toBeVisible();
    await expect(summary.getByText("Grátis", { exact: true })).toBeVisible();
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.waitForTimeout(300);
      await expectNoViolations(page);
    }
  });
});

test.describe("visão em lista", () => {
  test("alterna para lista, guarda na URL e na preferência, e passa no axe", async ({ page }) => {
    await page.goto("produtos");
    await expect(page.getByRole("article")).toHaveCount(12);
    await expect(page.getByText("descrição longa o bastante")).toHaveCount(0); // cartões não mostram descrição

    await page.locator("label").filter({ hasText: "Lista" }).click();
    await expect(page).toHaveURL(/vista=lista/);
    await expect(page.getByText(/Essence Mascara número 1,/)).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(12);

    // sem ?vista na URL, vale a última escolha
    await page.goto("produtos?categoria=laptops");
    await expect(page.getByRole("radio", { name: "Lista" })).toBeChecked();

    await expectNoViolations(page);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.waitForTimeout(300);
    await expectNoViolations(page);
  });

  test("em lista, comprar/favoritar/comparar funcionam e o layout cabe em 360 px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 700 });
    await page.goto("produtos?vista=lista");
    const item = page.getByRole("article", { name: "Essence Mascara 3", exact: true });
    await item.getByRole("button", { name: "Adicionar Essence Mascara 3 ao carrinho" }).click();
    await expect(
      item.getByRole("group", { name: "Quantidade de Essence Mascara 3" }),
    ).toBeVisible();
    await item.getByRole("button", { name: "Adicionar Essence Mascara 3 aos favoritos" }).click();
    await item.getByRole("button", { name: "Comparar Essence Mascara 3" }).click();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
