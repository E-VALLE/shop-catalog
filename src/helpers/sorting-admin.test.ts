import type { Product } from "../schemas/product-schema";
import { sortProducts } from "./sorting";

const make = (id: number, category: string, price: number, stock?: number): Product => ({
  id,
  title: `P${id}`,
  description: "d",
  category,
  price,
  stock,
  thumbnail: "t.png",
  images: [],
});

const items = [
  make(1, "furniture", 30, 5),
  make(2, "beauty", 10, undefined),
  make(3, "laptops", 20, 0),
];
const ids = (key: Parameters<typeof sortProducts>[1]) =>
  sortProducts(items, key).map((product) => product.id);

describe("sortProducts: colunas do admin", () => {
  it("preço de tabela, crescente e decrescente", () => {
    expect(ids("tabela-asc")).toEqual([2, 3, 1]);
    expect(ids("tabela-desc")).toEqual([1, 3, 2]);
  });

  it("estoque: desconhecido fica por último no crescente e no fim também no decrescente", () => {
    expect(ids("estoque-asc")).toEqual([3, 1, 2]);
    expect(ids("estoque-desc")).toEqual([1, 3, 2]);
  });

  it("categoria em ordem alfabética, nos dois sentidos", () => {
    expect(ids("categoria-asc")).toEqual([2, 1, 3]);
    expect(ids("categoria-desc")).toEqual([3, 1, 2]);
  });

  it("não altera o array original", () => {
    const before = items.map((product) => product.id);
    sortProducts(items, "tabela-desc");
    expect(items.map((product) => product.id)).toEqual(before);
  });
});
