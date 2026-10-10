/** Abaixo (ou igual) a este valor, avisamos que restam poucas unidades. */
export const LOW_STOCK_THRESHOLD = 5;

export type StockStatus = "unknown" | "out" | "low" | "in";

export function stockStatus(stock: number | undefined): StockStatus {
  if (stock === undefined) return "unknown";
  if (stock <= 0) return "out";
  if (stock <= LOW_STOCK_THRESHOLD) return "low";
  return "in";
}

/** Percentual de desconto a exibir (inteiro); 0 quando não há desconto relevante. */
export function discountPercent(discountPercentage: number | undefined): number {
  const rounded = Math.round(discountPercentage ?? 0);
  return rounded >= 1 ? Math.min(rounded, 99) : 0;
}
