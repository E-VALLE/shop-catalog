import type { Product } from "../schemas/product-schema";
import {
  applyFilters,
  countActiveFilters,
  filtersToParams,
  hasActiveFilters,
  parseFilters,
  SLIDER_STEPS,
  priceBounds,
  priceToSlider,
  sliderToPrice,
} from "./filters";

const make = (id: number, overrides: Partial<Product> = {}): Product => ({
  id,
  title: `P${id}`,
  description: "d",
  category: "beauty",
  price: 100,
  rating: 4,
  stock: 10,
  thumbnail: "t",
  images: [],
  ...overrides,
});
const ids = (list: Product[]) => list.map((p) => p.id);
const params = (query: string) => new URLSearchParams(query);

describe("parseFilters (URL)", () => {
  it("lê preço, nota e estoque", () => {
    expect(parseFilters(params("precoMin=10&precoMax=500&nota=4&estoque=1"))).toEqual({
      minPrice: 10,
      maxPrice: 500,
      minRating: 4,
      inStockOnly: true,
    });
  });

  it("URL vazia = nenhum filtro", () => {
    expect(parseFilters(params(""))).toEqual({});
  });

  it.each([
    ["precoMin=abc", {}],
    ["precoMin=-5", {}],
    ["precoMax=", {}],
    ["nota=0", {}],
    ["nota=9", {}],
    ["nota=xx", {}],
    ["estoque=0", {}],
    ["estoque=true", {}],
  ])("ignora valor inválido (%s)", (query, expected) => {
    expect(parseFilters(params(query))).toEqual(expected);
  });

  it("inverte a faixa quando min > max (URL editada à mão)", () => {
    expect(parseFilters(params("precoMin=300&precoMax=20"))).toEqual({
      minPrice: 20,
      maxPrice: 300,
    });
  });

  it("aceita preço mínimo zero", () => {
    expect(parseFilters(params("precoMin=0"))).toEqual({ minPrice: 0 });
  });

  it("ida e volta: filtersToParams → parseFilters", () => {
    const filters = { minPrice: 12, maxPrice: 99, minRating: 4.5, inStockOnly: true };
    const query = new URLSearchParams(
      Object.entries(filtersToParams(filters)).flatMap(([k, v]) => (v === null ? [] : [[k, v]])),
    );
    expect(parseFilters(query)).toEqual(filters);
  });

  it("filtersToParams remove (null) o que não está definido", () => {
    expect(filtersToParams({})).toEqual({
      precoMin: null,
      precoMax: null,
      nota: null,
      estoque: null,
    });
  });
});

describe("hasActiveFilters / countActiveFilters", () => {
  it("detecta filtros ativos", () => {
    expect(hasActiveFilters(undefined)).toBe(false);
    expect(hasActiveFilters({})).toBe(false);
    expect(hasActiveFilters({ inStockOnly: false })).toBe(false);
    expect(hasActiveFilters({ minPrice: 0 })).toBe(true);
    expect(hasActiveFilters({ minRating: 3 })).toBe(true);
  });

  it("a faixa de preço (mín e/ou máx) conta como um único filtro", () => {
    expect(countActiveFilters({ minPrice: 1, maxPrice: 9 })).toBe(1);
    expect(countActiveFilters({ minPrice: 1, minRating: 4, inStockOnly: true })).toBe(3);
    expect(countActiveFilters({})).toBe(0);
  });
});

describe("applyFilters", () => {
  const catalog = [
    make(1, { price: 100, discountPercentage: 50, rating: 4.9, stock: 5 }), // final 50
    make(2, { price: 200, rating: 3.2, stock: 0 }), // final 200, esgotado
    make(3, { price: 80, rating: undefined, stock: 3 }), // sem nota, final 80
    make(4, { price: 500, rating: 4.5, stock: 40 }),
  ];

  it("sem filtros devolve a mesma lista", () => {
    expect(applyFilters(catalog, undefined)).toBe(catalog);
    expect(applyFilters(catalog, {})).toBe(catalog);
  });

  it("faixa de preço usa o valor COM desconto, com limites inclusivos", () => {
    expect(ids(applyFilters(catalog, { minPrice: 50, maxPrice: 80 }))).toEqual([1, 3]);
    expect(ids(applyFilters(catalog, { maxPrice: 49.99 }))).toEqual([]);
    expect(ids(applyFilters(catalog, { minPrice: 200 }))).toEqual([2, 4]);
  });

  it("avaliação mínima: sem nota conta como 0 e fica de fora", () => {
    expect(ids(applyFilters(catalog, { minRating: 4.5 }))).toEqual([1, 4]);
    expect(ids(applyFilters(catalog, { minRating: 3 }))).toEqual([1, 2, 4]);
  });

  it("só em estoque remove esgotados (estoque desconhecido é mantido)", () => {
    const withUnknown = [...catalog, make(5, { stock: undefined })];
    expect(ids(applyFilters(withUnknown, { inStockOnly: true }))).toEqual([1, 3, 4, 5]);
  });

  it("combina todos os filtros (E lógico) e não altera o array original", () => {
    const before = ids(catalog);
    expect(
      ids(applyFilters(catalog, { minPrice: 50, minRating: 4, inStockOnly: true, maxPrice: 600 })),
    ).toEqual([1, 4]);
    expect(ids(catalog)).toEqual(before);
  });
});

describe("priceBounds", () => {
  it("arredonda para fora (floor/ceil) usando o preço com desconto", () => {
    expect(
      priceBounds([
        make(1, { price: 10, discountPercentage: 10 }), // 9
        make(2, { price: 99.2 }),
      ]),
    ).toEqual({ min: 9, max: 100 });
  });

  it("lista vazia não tem limites", () => {
    expect(priceBounds([])).toBeNull();
  });
});

describe("escala do controle de preço", () => {
  const bounds = { min: 9, max: 32_000 };

  it("as pontas do slider coincidem com os limites do catálogo", () => {
    expect(sliderToPrice(0, bounds)).toBe(9);
    expect(sliderToPrice(SLIDER_STEPS, bounds)).toBe(32_000);
  });

  it("é crescente e dá resolução maior no começo da faixa (curva cúbica)", () => {
    const at = (p: number) => sliderToPrice(p, bounds);
    expect(at(10)).toBeLessThan(at(20));
    expect(at(50)).toBeLessThan(at(80));
    // metade do curso ainda está na faixa barata: ~4 mil em vez de ~16 mil (linear)
    expect(at(50)).toBeLessThan(5_000);
    // e os primeiros passos são finos (dezenas de dólares), não milhares
    expect(at(10) - at(0)).toBeLessThan(100);
  });

  it("priceToSlider é (quase) o inverso de sliderToPrice", () => {
    for (const position of [0, 7, 25, 50, 83, 100]) {
      const price = sliderToPrice(position, bounds);
      expect(Math.abs(priceToSlider(price, bounds) - position)).toBeLessThanOrEqual(1);
    }
  });

  it("valores fora dos limites são contidos; limites iguais não quebram", () => {
    expect(sliderToPrice(-20, bounds)).toBe(9);
    expect(sliderToPrice(500, bounds)).toBe(32_000);
    expect(priceToSlider(-5, bounds)).toBe(0);
    expect(priceToSlider(10 ** 9, bounds)).toBe(SLIDER_STEPS);
    expect(priceToSlider(10, { min: 5, max: 5 })).toBe(0);
  });
});
