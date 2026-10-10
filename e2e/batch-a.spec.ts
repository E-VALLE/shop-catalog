import { expect, test } from "./fixtures/mock-api";

test.describe("Home: benefícios, promoções e vistos recentemente", () => {
  test("mostra a faixa de benefícios e a seção Em promoção (maiores descontos primeiro)", async ({
    page,
  }) => {
    await page.goto("");
    await expect(page.getByText("Frete grátis")).toBeVisible();
    await expect(page.getByText("Devolução em 30 dias")).toBeVisible();
    await expect(page.getByText("Pagamento seguro")).toBeVisible();
    await expect(page.getByText(/acima de R\$\s250,00/)).toBeVisible(); // US$ 50 na cotação do mock (5)

    const promos = page.getByRole("region", { name: "Em promoção" });
    await expect(promos.getByRole("article")).toHaveCount(4);
    // o mock dá 15% ao produto 1 e 10% aos demais: ele vem primeiro
    await expect(promos.getByRole("article").first()).toHaveAccessibleName("Essence Mascara 1");
  });

  test("vistos recentemente: do mais novo ao mais antigo, sem repetir o produto atual", async ({
    page,
  }) => {
    await page.goto("");
    await expect(page.getByRole("region", { name: "Vistos recentemente" })).toHaveCount(0);

    await page.goto("produtos/3");
    await expect(page.getByRole("heading", { level: 1, name: "Essence Mascara 3" })).toBeVisible();
    await page.goto("produtos/4");
    await expect(page.getByRole("heading", { level: 1, name: "Essence Mascara 4" })).toBeVisible();

    // nos detalhes de 4, só o 3 (o próprio produto não aparece)
    const onDetails = page.getByRole("region", { name: "Vistos recentemente" });
    await expect(onDetails.getByRole("article")).toHaveCount(1);
    await expect(onDetails.getByRole("article").first()).toHaveAccessibleName("Essence Mascara 3");

    await page.goto("");
    const onHome = page.getByRole("region", { name: "Vistos recentemente" });
    const names = await onHome
      .getByRole("article")
      .evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    expect(names).toEqual(["Essence Mascara 4", "Essence Mascara 3"]);
  });
});

test.describe("card: seletor de quantidade", () => {
  test("Comprar vira − N +, atualiza o contador do carrinho e persiste", async ({ page }) => {
    await page.goto("produtos");
    const card = page.getByRole("article", { name: "Essence Mascara 3", exact: true });
    await card.getByRole("button", { name: "Adicionar Essence Mascara 3 ao carrinho" }).click();

    const group = card.getByRole("group", { name: "Quantidade de Essence Mascara 3" });
    await expect(group).toContainText("1");
    await card.getByRole("button", { name: "Aumentar quantidade de Essence Mascara 3" }).click();
    await expect(group).toContainText("2");
    await expect(page.getByRole("link", { name: "Carrinho, 2 itens" })).toBeVisible();

    await page.reload();
    await expect(
      page
        .getByRole("article", { name: "Essence Mascara 3", exact: true })
        .getByRole("group", { name: "Quantidade de Essence Mascara 3" }),
    ).toContainText("2");
  });

  test("diminuir de 1 remove, avisa e permite desfazer", async ({ page }) => {
    await page.goto("produtos");
    const card = page.getByRole("article", { name: "Essence Mascara 3", exact: true });
    await card.getByRole("button", { name: "Adicionar Essence Mascara 3 ao carrinho" }).click();
    await card.getByRole("button", { name: "Diminuir quantidade de Essence Mascara 3" }).click();

    await expect(
      card.getByRole("button", { name: "Adicionar Essence Mascara 3 ao carrinho" }),
    ).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "removido do carrinho" })).toBeVisible();
    await page.getByRole("button", { name: "Desfazer" }).click();
    await expect(
      card.getByRole("group", { name: "Quantidade de Essence Mascara 3" }),
    ).toContainText("1");
  });

  test("limita ao estoque: produto com 3 unidades não passa de 3", async ({ page }) => {
    await page.goto("produtos");
    const card = page.getByRole("article", { name: "Essence Mascara 1", exact: true }); // estoque 3
    await card.getByRole("button", { name: "Adicionar Essence Mascara 1 ao carrinho" }).click();
    const plus = card.getByRole("button", { name: "Aumentar quantidade de Essence Mascara 1" });
    await plus.click();
    await plus.click();
    await expect(card.getByRole("group")).toContainText("3");
    await expect(plus).toBeDisabled();
  });
});

test.describe("moeda manual", () => {
  test("troca de R$ para US$ no cabeçalho, persiste e vale também em inglês", async ({ page }) => {
    await page.goto("produtos");
    const card = page.getByRole("article").first();
    await expect(card.getByText(/^R\$/).first()).toBeVisible();

    await page.getByRole("button", { name: /Moeda:/ }).click();
    await page.getByRole("menuitem", { name: "Dólar (US$)" }).click();
    await expect(card.getByText(/^US\$/).first()).toBeVisible();

    await page.reload();
    await expect(page.getByRole("article").first().getByText(/^US\$/).first()).toBeVisible();

    // inglês + real: a escolha manual vale mais que o idioma
    await page.getByRole("button", { name: /Idioma/ }).click();
    await page.getByRole("menuitem", { name: "English" }).click();
    await page.getByRole("button", { name: /Currency:/ }).click();
    await page.getByRole("menuitem", { name: "Brazilian real (R$)" }).click();
    await expect(page.getByRole("article").first().getByText(/R\$/).first()).toBeVisible();
  });
});
