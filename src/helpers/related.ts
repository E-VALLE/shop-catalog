import type { Product } from "../schemas/product-schema";

export const RELATED_COUNT = 4;

/** Produtos da mesma categoria (exceto o atual); marca igual vem primeiro. */
export function pickRelated(candidates: Product[], current: Product, max = RELATED_COUNT) {
  return candidates
    .filter((candidate) => candidate.id !== current.id)
    .sort(
      (a, b) =>
        Number(b.brand !== undefined && b.brand === current.brand) -
        Number(a.brand !== undefined && a.brand === current.brand),
    )
    .slice(0, max);
}
