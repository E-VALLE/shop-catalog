import type { Product } from "../schemas/product-schema";
import { stockStatus } from "./stock";

export interface CategoryCount {
  category: string;
  count: number;
}

/** Quantidade de produtos por categoria, da maior para a menor (empate: ordem alfabética). */
export function countByCategory(products: Product[], limit = Infinity): CategoryCount[] {
  const counts = new Map<string, number>();
  for (const { category } of products) counts.set(category, (counts.get(category) ?? 0) + 1);
  return [...counts]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category))
    .slice(0, limit);
}

export interface StockBreakdown {
  inStock: number;
  low: number;
  out: number;
}

/** Situação do estoque; produto sem informação de estoque conta como disponível. */
export function stockBreakdown(products: Product[]): StockBreakdown {
  const result: StockBreakdown = { inStock: 0, low: 0, out: 0 };
  for (const { stock } of products) {
    const status = stockStatus(stock);
    if (status === "out") result.out += 1;
    else if (status === "low") result.low += 1;
    else result.inStock += 1;
  }
  return result;
}

export type StockGroup = "in" | "low" | "out";

/** Ordem de reposição: menor estoque primeiro (esgotados no topo); desempate alfabético. */
const byStockThenTitle = (a: Product, b: Product) =>
  (a.stock ?? Infinity) - (b.stock ?? Infinity) || a.title.localeCompare(b.title);

/** Produtos de um grupo do gráfico de estoque (mesma regra de `stockBreakdown`). */
export function productsByStock(products: Product[], group: StockGroup): Product[] {
  const matches = (product: Product) => {
    const status = stockStatus(product.stock);
    return group === "out"
      ? status === "out"
      : group === "low"
        ? status === "low"
        : status !== "out" && status !== "low";
  };
  return products.filter(matches).sort(byStockThenTitle);
}

/** Tudo que precisa de reposição: poucas unidades + esgotados, do mais crítico ao menos. */
export function lowStockProducts(products: Product[]): Product[] {
  return products
    .filter((product) => {
      const status = stockStatus(product.stock);
      return status === "low" || status === "out";
    })
    .sort(byStockThenTitle);
}

export function productsInCategory(products: Product[], category: string): Product[] {
  return products
    .filter((product) => product.category === category)
    .sort((a, b) => a.title.localeCompare(b.title));
}

/** Os `count` mais baratos e os `count` mais caros (preço de tabela, como o admin exibe). */
export function priceExtremes(products: Product[], count = 5) {
  const sorted = [...products].sort((a, b) => a.price - b.price || a.title.localeCompare(b.title));
  return {
    cheapest: sorted.slice(0, count),
    mostExpensive: sorted.slice(-count).reverse(),
  };
}

export type DrillTarget =
  | { kind: "all" }
  | { kind: "categories" }
  | { kind: "prices" }
  | { kind: "lowStock" }
  | { kind: "stock"; group: StockGroup }
  | { kind: "category"; category: string };

export interface CategoryAverage {
  category: string;
  /** Preço médio de tabela (USD), arredondado a centavos. */
  average: number;
  count: number;
}

/** Preço médio por categoria, do mais barato ao mais caro (empate: ordem alfabética). */
export function averagePriceByCategory(products: Product[]): CategoryAverage[] {
  const sums = new Map<string, { total: number; count: number }>();
  for (const { category, price } of products) {
    const current = sums.get(category) ?? { total: 0, count: 0 };
    sums.set(category, { total: current.total + price, count: current.count + 1 });
  }
  return [...sums]
    .map(([category, { total, count }]) => ({
      category,
      count,
      average: Math.round((total / count) * 100) / 100,
    }))
    .sort((a, b) => a.average - b.average || a.category.localeCompare(b.category));
}
