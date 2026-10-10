import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures/mock-api";

async function signIn(page: Page, destination = "admin") {
  await page.goto("login");
  await page.getByLabel("Usuário").fill("emilys");
  await page.getByLabel("Senha").fill("emilyspass");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  if (destination !== "admin") await page.goto(destination);
}

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const summary = violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`);
  expect(summary, summary.join("\n")).toEqual([]);
}

const rowTitles = (page: Page, root = page.getByRole("dialog")) =>
  root
    .getByRole("row")
    .evaluateAll((rows) =>
      rows.slice(1).map((row) => row.querySelector("a")?.textContent?.trim() ?? ""),
    );

test.describe("dashboard: clicar nos painéis e nas legendas", () => {
  test("'Estoque baixo' lista os produtos a repor, do mais crítico ao menos", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: /Estoque baixo \(≤5\): 2\./ }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Produtos com estoque baixo" })).toBeVisible();
    // mock: produto 2 esgotado (0) e produto 1 com 3 unidades
    expect(await rowTitles(page)).toEqual(["Essence Mascara 2", "Essence Mascara 1"]);
    await expect(dialog.getByRole("link", { name: "Editar Essence Mascara 2" })).toHaveAttribute(
      "href",
      /\/admin\/produtos\/2\/editar$/,
    );

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("a legenda 'Poucas unidades' do gráfico abre só essa situação", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: /Poucas unidades \(≤5\): 1 produtos/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Poucas unidades (≤5)" })).toBeVisible();
    expect(await rowTitles(page)).toEqual(["Essence Mascara 1"]);
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: /Esgotado: 1 produtos/ }).click();
    expect(await rowTitles(page)).toEqual(["Essence Mascara 2"]);
  });

  test("Categorias → produtos da categoria; Preço médio → extremos; Produtos → todos", async ({
    page,
  }) => {
    await signIn(page);
    await page.getByRole("button", { name: /^Categorias: 4\./ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("row", { name: /Beleza/ })).toContainText("12");
    await dialog.getByRole("button", { name: "Ver produtos da categoria Beleza" }).click();
    await expect(dialog.getByRole("heading", { name: "Categoria: Beleza" })).toBeVisible();
    expect(await rowTitles(page)).toHaveLength(12);
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: /^Preço médio:/ }).click();
    await expect(dialog.getByRole("heading", { name: "Mais caros", level: 3 })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Mais baratos", level: 3 })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: /^Produtos: 48\./ }).click();
    expect(await rowTitles(page)).toHaveLength(48);
  });

  test("clicar numa barra do gráfico abre os produtos da categoria", async ({ page }) => {
    await signIn(page);
    const bar = page.locator(".recharts-bar-rectangle").first();
    await expect(bar).toBeVisible();
    await bar.click();
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: /^Categoria:/ }),
    ).toBeVisible();
  });

  test("o diálogo aberto passa no axe (claro e escuro) e devolve o foco ao fechar", async ({
    page,
  }) => {
    await signIn(page);
    const panel = page.getByRole("button", { name: /Estoque baixo/ });
    await panel.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.waitForTimeout(400);
      await expectNoViolations(page);
    }
    await page.keyboard.press("Escape");
    await expect(panel).toBeFocused();
  });

  test("gráfico de linha do preço médio por categoria é desenhado", async ({ page }) => {
    await signIn(page);
    const chart = page.getByRole("img", { name: /Preço médio por categoria/ });
    await expect(chart).toBeVisible();
    await expect(chart.locator("path.recharts-line-curve")).toBeVisible();
    await expect(chart).toHaveAccessibleName(/Beleza: R\$/);
  });
});

test.describe("admin: ordenar, selecionar, editar no lugar e exportar", () => {
  test("ordena por preço e estoque nos cabeçalhos (aria-sort + URL)", async ({ page }) => {
    await signIn(page, "admin/produtos");
    await expect(page.getByRole("table")).toBeVisible();

    await page.getByRole("button", { name: "Ordenar por Preço" }).click();
    await expect(page).toHaveURL(/ordem=tabela-asc/);
    await expect(page.getByRole("columnheader", { name: /Preço/ })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    await expect(page.getByRole("row").nth(1)).toContainText("Essence Mascara 1");

    await page.getByRole("button", { name: "Ordenar por Preço" }).click();
    await expect(page).toHaveURL(/ordem=tabela-desc/);
    await expect(page.getByRole("row").nth(1)).toContainText("Oak Chair 12"); // mais caro

    await page.getByRole("button", { name: "Ordenar por Estoque" }).click();
    await expect(page).toHaveURL(/ordem=estoque-asc/);
    await expect(page.getByRole("row").nth(1)).toContainText("Essence Mascara 2"); // estoque 0
  });

  test("seleciona vários, exclui com confirmação e desfaz", async ({ page }) => {
    await signIn(page, "admin/produtos");
    await page.getByRole("checkbox", { name: "Selecionar Essence Mascara 3" }).check();
    await page.getByRole("checkbox", { name: "Selecionar Essence Mascara 4" }).check();
    await expect(page.getByText("2 selecionados")).toBeVisible();

    await page.getByRole("button", { name: "Excluir selecionados" }).click();
    await expect(page.getByRole("dialog").getByText("Excluir 2 produtos").first()).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();

    await expect(page.getByText("2 produtos excluídos")).toBeVisible();
    await expect(page.getByRole("link", { name: "Essence Mascara 3", exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Desfazer" }).click();
    await expect(page.getByRole("link", { name: "Essence Mascara 3", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Essence Mascara 4", exact: true })).toBeVisible();
  });

  test("edita preço e estoque no lugar (Enter salva, Esc cancela, valida)", async ({ page }) => {
    await signIn(page, "admin/produtos");
    const row = page.getByRole("row", { name: /Essence Mascara 3/ });

    await row.getByRole("button", { name: "Editar preço de Essence Mascara 3" }).click();
    const price = page.getByRole("textbox", { name: /Novo preço/ });
    await price.fill("");
    await price.fill("99.5");
    await price.press("Enter");
    await expect(page.getByText("Preço atualizado (simulado)")).toBeVisible();
    await expect(row).toContainText("R$ 497,50"); // 99,50 × 5

    await row.getByRole("button", { name: "Editar estoque de Essence Mascara 3" }).click();
    const stock = page.getByRole("textbox", { name: /Novo estoque/ });
    await stock.fill("");
    await stock.press("Enter");
    await expect(page.getByText("Informe o estoque")).toBeVisible();
    await stock.press("Escape");
    await expect(page.getByRole("textbox", { name: /Novo estoque/ })).toHaveCount(0);
  });

  test("exporta o catálogo em CSV (pt-BR: ; e vírgula decimal) com as edições da sessão", async ({
    page,
  }) => {
    await signIn(page, "admin/produtos");
    const row = page.getByRole("row", { name: /Essence Mascara 3/ });
    await row.getByRole("button", { name: "Editar preço de Essence Mascara 3" }).click();
    const price = page.getByRole("textbox", { name: /Novo preço/ });
    await price.fill("");
    await price.fill("99.5");
    await price.press("Enter");
    await expect(page.getByText("Preço atualizado (simulado)")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar CSV" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^produtos-\d{4}-\d{2}-\d{2}\.csv$/);

    const content = await readFile((await download.path())!, "utf8");
    const text = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content; // BOM do UTF-8
    const lines = text.trim().split("\r\n");
    expect(lines[0]).toBe(
      "Código;Título;Categoria;Marca;Preço de tabela (USD);Desconto (%);Preço final (USD);Estoque;Avaliação",
    );
    expect(lines).toHaveLength(49); // cabeçalho + 48 produtos
    expect(lines.find((l) => l.startsWith("3;Essence Mascara 3;"))).toContain(";99,5;");
    await expect(page.getByText(/baixado \(48 produtos\)/)).toBeVisible();
  });

  test("tabela do admin com seleção e edição passa no axe (claro e escuro)", async ({ page }) => {
    await signIn(page, "admin/produtos");
    await page.getByRole("checkbox", { name: "Selecionar Essence Mascara 3" }).check();
    await page
      .getByRole("row", { name: /Essence Mascara 4/ })
      .getByRole("button", { name: /Editar preço/ })
      .click();
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.waitForTimeout(300);
      await expectNoViolations(page);
    }
  });
});
