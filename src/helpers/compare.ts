import type { Product } from "../schemas/product-schema";

/** Ids com o melhor valor (empates incluídos); só faz sentido com 2 ou mais produtos. */
export function bestIds(
  products: Product[],
  value: (product: Product) => number | undefined,
  better: "min" | "max",
): Set<number> {
  const scored = products.flatMap((p) => {
    const v = value(p);
    return v === undefined ? [] : [{ id: p.id, v }];
  });
  if (products.length < 2 || scored.length === 0) return new Set();
  const target = (better === "min" ? Math.min : Math.max)(...scored.map((s) => s.v));
  return new Set(scored.filter((s) => s.v === target).map((s) => s.id));
}
