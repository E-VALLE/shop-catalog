import { screen, within } from "@testing-library/react";
import {
  averagePriceByCategory,
  countByCategory,
  stockBreakdown,
} from "../helpers/dashboard-stats";
import type { Product } from "../schemas/product-schema";
import * as productsService from "../services/products-service";
import { renderWithProviders } from "../test/render-with-providers";
import { Dashboard } from "./dashboard";

const make = (id: number, category: string, stock?: number, price = 10): Product => ({
  id,
  title: `P${id}`,
  description: "d",
  category,
  price,
  stock,
  thumbnail: "t.png",
  images: [],
});

describe("countByCategory", () => {
  const products = [
    make(1, "beauty"),
    make(2, "furniture"),
    make(3, "furniture"),
    make(4, "laptops"),
    make(5, "laptops"),
    make(6, "tablets"),
  ];

  it("ordena do maior para o menor e desempata em ordem alfabética", () => {
    expect(countByCategory(products)).toEqual([
      { category: "furniture", count: 2 },
      { category: "laptops", count: 2 },
      { category: "beauty", count: 1 },
      { category: "tablets", count: 1 },
    ]);
  });

  it("respeita o limite e aceita lista vazia", () => {
    expect(countByCategory(products, 2)).toHaveLength(2);
    expect(countByCategory([])).toEqual([]);
  });
});

describe("stockBreakdown", () => {
  it("separa disponível, poucas unidades e esgotado (limites 0 e 5)", () => {
    const result = stockBreakdown([
      make(1, "a", 0),
      make(2, "a", 1),
      make(3, "a", 5),
      make(4, "a", 6),
      make(5, "a", 100),
    ]);
    expect(result).toEqual({ inStock: 2, low: 2, out: 1 });
  });

  it("estoque desconhecido conta como disponível; vazio zera tudo", () => {
    expect(stockBreakdown([make(1, "a", undefined)])).toEqual({ inStock: 1, low: 0, out: 0 });
    expect(stockBreakdown([])).toEqual({ inStock: 0, low: 0, out: 0 });
  });
});

describe("Dashboard: gráficos", () => {
  afterEach(() => vi.restoreAllMocks());

  const render = () => {
    const products = [
      make(1, "beauty", 3),
      make(2, "beauty", 0),
      make(3, "furniture", 40),
      make(4, "furniture", 40),
      make(5, "furniture", 40),
    ];
    vi.spyOn(productsService, "listProducts").mockResolvedValue({
      products,
      total: products.length,
      skip: 0,
      limit: 0,
    });
    return renderWithProviders(<Dashboard />);
  };

  it("mostra os dois gráficos com descrição em texto e legenda numérica", async () => {
    render();

    const categories = await screen.findByRole("img", {
      name: /Produtos por categoria \(top 10\)/,
    });
    expect(categories).toHaveAccessibleName(/Móveis: 3, Beleza: 2/);

    const stock = screen.getByRole("img", { name: /Situação do estoque/ });
    expect(stock).toHaveAccessibleName(/Em estoque: 3, Poucas unidades \(≤5\): 1, Esgotado: 1/);

    // legenda visível (não depende só de cor)
    const legend = screen.getByRole("list");
    expect(within(legend).getByText(/Em estoque:/).parentElement).toHaveTextContent(
      "Em estoque: 3",
    );
    expect(within(legend).getAllByRole("listitem")).toHaveLength(3);
  });

  it("o indicador 'Estoque baixo' usa o mesmo critério do gráfico (poucas + esgotado)", async () => {
    render();
    const metric = (await screen.findByText("Estoque baixo (≤5)")).closest("div")!.parentElement!;
    expect(metric).toHaveTextContent("2");
  });

  it("cada gráfico é uma seção rotulada pelo seu título", async () => {
    render();
    expect(
      await screen.findByRole("region", { name: /Produtos por categoria/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Situação do estoque" })).toBeInTheDocument();
  });
});

describe("averagePriceByCategory", () => {
  const items = [
    make(1, "beauty", 1, 10),
    make(2, "beauty", 1, 20),
    make(3, "furniture", 1, 100),
    make(4, "tablets", 1, 15),
  ];

  it("calcula a média por categoria, do mais barato ao mais caro", () => {
    expect(averagePriceByCategory(items)).toEqual([
      { category: "beauty", count: 2, average: 15 },
      { category: "tablets", count: 1, average: 15 },
      { category: "furniture", count: 1, average: 100 },
    ]); // empate (15) em ordem alfabética
  });

  it("arredonda a centavos e aceita lista vazia", () => {
    expect(
      averagePriceByCategory([make(1, "a", 1, 10), make(2, "a", 1, 10), make(3, "a", 1, 10.01)]),
    ).toEqual([{ category: "a", count: 3, average: 10 }]);
    expect(averagePriceByCategory([])).toEqual([]);
  });
});

describe("Dashboard: preço médio por categoria (gráfico de linha)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("mostra o gráfico com descrição em texto de cada categoria e preço", async () => {
    const products = [make(1, "beauty", 3, 10), make(2, "furniture", 40, 100)];
    vi.spyOn(productsService, "listProducts").mockResolvedValue({
      products,
      total: 2,
      skip: 0,
      limit: 0,
    });
    // cotação em cache (5): os valores saem em reais desde o início
    localStorage.setItem(
      "shop-catalog:fx",
      JSON.stringify({ rate: 5, quotedAt: "2026-10-02T12:00:00.000Z", savedAt: Date.now() }),
    );
    renderWithProviders(<Dashboard />);
    const chart = await screen.findByRole("img", { name: /Preço médio por categoria/ });
    expect(chart).toHaveAccessibleName(/Beleza: R\$\s50,00, Móveis: R\$\s500,00/);
    expect(screen.getByRole("region", { name: "Preço médio por categoria" })).toBeInTheDocument();
  });
});
