import type { Product } from "../schemas/product-schema";
import { SORT_API_PARAMS, SORT_KEYS, parseSort, sortProducts } from "./sorting";
import { LOW_STOCK_THRESHOLD, discountPercent, stockStatus } from "./stock";

const make = (id: number, title: string, price: number, rating?: number): Product => ({
  id,
  title,
  description: "d",
  category: "beauty",
  price,
  rating,
  thumbnail: "t.png",
  images: [],
});

const items = [
  make(1, "banana 10", 5, 3),
  make(2, "Álamo", 20, 4.9),
  make(3, "banana 2", 12),
  make(4, "Zebra", 1, 4.1),
];
const ids = (list: Product[]) => list.map((p) => p.id);

describe("parseSort", () => {
  it.each(SORT_KEYS)("aceita %s", (key) => expect(parseSort(key)).toBe(key));

  it.each([null, undefined, "", "price", "PRECO-ASC", "../x"])("rejeita %j", (value) => {
    expect(parseSort(value)).toBeNull();
  });

  it("tem parâmetros de API para cada ordenação", () => {
    for (const key of SORT_KEYS)
      expect(SORT_API_PARAMS[key]).toEqual(expect.objectContaining({ sortBy: expect.any(String) }));
  });
});

describe("sortProducts", () => {
  it("por preço crescente e decrescente", () => {
    expect(ids(sortProducts(items, "preco-asc"))).toEqual([4, 1, 3, 2]);
    expect(ids(sortProducts(items, "preco-desc"))).toEqual([2, 3, 1, 4]);
  });

  it("preço considera o desconto, não o valor de tabela", () => {
    const list = [
      { ...make(1, "A", 10), discountPercentage: 0 }, // final 10
      { ...make(2, "B", 12), discountPercentage: 50 }, // final 6
    ];
    expect(ids(sortProducts(list, "preco-asc"))).toEqual([2, 1]);
    expect(ids(sortProducts(list, "preco-desc"))).toEqual([1, 2]);
  });

  it("por avaliação (maior primeiro; sem nota fica por último)", () => {
    expect(ids(sortProducts(items, "avaliacao"))).toEqual([2, 4, 1, 3]);
  });

  it("por nome ignorando acento/caixa e com números naturais (2 antes de 10)", () => {
    expect(ids(sortProducts(items, "nome"))).toEqual([2, 3, 1, 4]);
  });

  it("sem chave devolve a mesma ordem e nunca altera o array original", () => {
    expect(sortProducts(items, null)).toBe(items);
    const before = ids(items);
    sortProducts(items, "preco-desc");
    expect(ids(items)).toEqual(before);
  });
});

describe("stockStatus", () => {
  it.each([
    [undefined, "unknown"],
    [0, "out"],
    [-3, "out"],
    [1, "low"],
    [LOW_STOCK_THRESHOLD, "low"],
    [LOW_STOCK_THRESHOLD + 1, "in"],
    [100, "in"],
  ])("estoque %j → %s", (stock, expected) => expect(stockStatus(stock)).toBe(expected));
});

describe("discountPercent", () => {
  it.each([
    [undefined, 0],
    [0, 0],
    [0.4, 0], // arredonda para 0: não vale um selo
    [-5, 0],
    [9.7, 10],
    [15, 15],
    [100, 99], // nunca mostra "-100%"
  ])("%j → %j", (value, expected) => expect(discountPercent(value)).toBe(expected));
});
