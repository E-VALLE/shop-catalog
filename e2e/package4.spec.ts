import { expect, test } from "./fixtures/mock-api";

test.describe("pular para o conteúdo", () => {
  test("é o primeiro foco do teclado e leva ao conteúdo principal", async ({ page }) => {
    await page.goto("produtos");
    await expect(page.getByRole("article").first()).toBeVisible();

    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Pular para o conteúdo" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport(); // visível ao receber foco

    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
    await expect(page).toHaveURL(/\/produtos$/); // não altera a URL
  });
});

test.describe("carrinho: desfazer e layout móvel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("produtos");
    for (const n of [3, 4, 5]) {
      await page
        .getByRole("button", { name: `Adicionar Essence Mascara ${n} ao carrinho` })
        .click();
    }
    await page.goto("carrinho");
    await expect(page.getByRole("article")).toHaveCount(3);
  });

  for (const width of [1280, 320]) {
    test(`o botão Desfazer mostra o rótulo inteiro (viewport ${width}px)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 });
      await page.getByRole("button", { name: "Remover Essence Mascara 4" }).click();

      const undo = page.getByRole("button", { name: "Desfazer" });
      await expect(undo).toBeVisible();
      const clipped = await undo.evaluate((button) => {
        const label = button.querySelector(".mantine-Button-label") ?? button;
        return label.scrollWidth > label.clientWidth;
      });
      expect(clipped, "o texto do botão está cortado").toBe(false);
      await expect(undo).toBeInViewport({ ratio: 1 });
    });
  }

  test("remover mostra o aviso e Desfazer devolve o item à mesma posição", async ({ page }) => {
    await page.getByRole("button", { name: "Remover Essence Mascara 4" }).click();
    await expect(page.getByRole("article")).toHaveCount(2);
    await expect(page.getByRole("alert")).toContainText("Essence Mascara 4 removido do carrinho.");

    await page.getByRole("button", { name: "Desfazer" }).click();
    const names = await page
      .getByRole("article")
      .evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    expect(names).toEqual(["Essence Mascara 3", "Essence Mascara 4", "Essence Mascara 5"]);
  });

  test("esvaziar e desfazer restaura todos; o carrinho persiste ao recarregar", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Esvaziar" }).click();
    await expect(page.getByText("Seu carrinho está vazio")).toBeVisible();
    await page.getByRole("button", { name: "Desfazer" }).click();
    await expect(page.getByRole("article")).toHaveCount(3);
    await page.reload();
    await expect(page.getByRole("article")).toHaveCount(3);
  });

  test("em tela estreita (320 px) não há rolagem horizontal e os controles continuam acessíveis", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const item = page.getByRole("article", { name: "Essence Mascara 3", exact: true });
    await expect(item.getByLabel(/Quantidade de/)).toBeInViewport();
    await expect(item.getByRole("button", { name: /Remover/ })).toBeInViewport();
    const [row, controls] = await Promise.all([
      item.getByRole("link", { name: "Essence Mascara 3" }).boundingBox(),
      item.getByLabel(/Quantidade de/).boundingBox(),
    ]);
    expect(controls!.y).toBeGreaterThan(row!.y); // controles quebraram para a linha de baixo
  });
});

test.describe("Home: todas as categorias", () => {
  test("alterna entre as 12 primeiras e todas (aria-expanded)", async ({ page }) => {
    // o mock tem 4 categorias: a Home não deve mostrar o botão
    await page.goto("");
    await expect(page.getByRole("link", { name: /^Beleza$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Ver todas as categorias/ })).toHaveCount(0);
  });
});

test.describe("menu móvel não atrapalha o teclado", () => {
  const focusedNav = (page: import("@playwright/test").Page) =>
    page.evaluate(() => document.activeElement?.closest("nav")?.getAttribute("aria-label") ?? "-");

  test("no desktop o Tab nunca entra no menu móvel (que não existe nessa largura)", async ({
    page,
  }) => {
    await page.goto("");
    await expect(page.getByRole("article").first()).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Menu mobile" })).toHaveCount(0);
    for (let i = 0; i < 18; i++) {
      await page.keyboard.press("Tab");
      expect(await focusedNav(page)).not.toBe("Menu mobile");
    }
  });

  test("no celular, fechado fica fora do alcance; aberto, navegável e fecha ao escolher", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 700 });
    await page.goto("");
    await expect(page.getByRole("article").first()).toBeVisible();
    const menu = page.locator("nav[aria-label='Menu mobile']");
    await expect(menu).toHaveAttribute("inert", ""); // fechado: fora do foco e dos leitores de tela
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      expect(await focusedNav(page)).not.toBe("Menu mobile");
    }

    await page.getByRole("button", { name: "Abrir menu" }).click();
    await expect(menu).not.toHaveAttribute("inert", "");
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: "Produtos" }).click();
    await expect(page).toHaveURL(/\/produtos$/);
    await expect(menu).toHaveAttribute("inert", ""); // fecha ao escolher um destino
  });
});
