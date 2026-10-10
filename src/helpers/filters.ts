import type { Product } from "../schemas/product-schema";
import { discountedPrice } from "./formatters";
import { stockStatus } from "./stock";

/** Filtros avançados do catálogo. Preços em USD, já com desconto (o que a tela mostra). */
export interface ProductFilters {
  minPrice?: number;
  maxPrice?: number;
  /** Avaliação mínima (ex.: 4 = "4 estrelas ou mais"). */
  minRating?: number;
  inStockOnly?: boolean;
}

export const RATING_OPTIONS = [3, 4, 4.5] as const;

export const hasActiveFilters = (filters: ProductFilters | undefined): boolean =>
  Boolean(
    filters &&
    (filters.minPrice !== undefined ||
      filters.maxPrice !== undefined ||
      filters.minRating !== undefined ||
      filters.inStockOnly),
  );

export function countActiveFilters(filters: ProductFilters): number {
  return [
    filters.minPrice !== undefined || filters.maxPrice !== undefined,
    filters.minRating !== undefined,
    filters.inStockOnly,
  ].filter(Boolean).length;
}

const positiveNumber = (raw: string | null): number | undefined => {
  if (raw === null || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
};

/** Lê os filtros da URL (`precoMin`, `precoMax`, `nota`, `estoque=1`), ignorando valores inválidos. */
export function parseFilters(params: URLSearchParams): ProductFilters {
  let minPrice = positiveNumber(params.get("precoMin"));
  let maxPrice = positiveNumber(params.get("precoMax"));
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice]; // URL editada à mão com faixa invertida
  }
  const rating = positiveNumber(params.get("nota"));
  return {
    ...(minPrice !== undefined && { minPrice }),
    ...(maxPrice !== undefined && { maxPrice }),
    ...(rating !== undefined && rating > 0 && rating <= 5 && { minRating: rating }),
    ...(params.get("estoque") === "1" && { inStockOnly: true }),
  };
}

/** Parâmetros de URL para cada filtro (null remove o parâmetro). */
export function filtersToParams(filters: ProductFilters): Record<string, string | null> {
  return {
    precoMin: filters.minPrice !== undefined ? String(filters.minPrice) : null,
    precoMax: filters.maxPrice !== undefined ? String(filters.maxPrice) : null,
    nota: filters.minRating !== undefined ? String(filters.minRating) : null,
    estoque: filters.inStockOnly ? "1" : null,
  };
}

export function applyFilters(products: Product[], filters: ProductFilters | undefined): Product[] {
  if (!hasActiveFilters(filters) || !filters) return products;
  return products.filter((product) => {
    const price = discountedPrice(product.price, product.discountPercentage);
    if (filters.minPrice !== undefined && price < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && price > filters.maxPrice) return false;
    if (filters.minRating !== undefined && (product.rating ?? 0) < filters.minRating) return false;
    if (filters.inStockOnly && stockStatus(product.stock) === "out") return false;
    return true;
  });
}

/** Limites (inteiros) de preço do catálogo, para o controle deslizante. */
export function priceBounds(products: Product[]): { min: number; max: number } | null {
  if (products.length === 0) return null;
  const prices = products.map((p) => discountedPrice(p.price, p.discountPercentage));
  return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
}

/**
 * Escala do controle de preço. O catálogo vai de poucos dólares a dezenas de milhares (veículos,
 * relógios); numa escala linear o início da faixa ficaria impossível de ajustar. Usamos uma curva
 * cúbica: o slider anda de 0 a 100 e o preço cresce devagar no começo e rápido no fim.
 */
export const SLIDER_STEPS = 100;

export function sliderToPrice(position: number, bounds: { min: number; max: number }): number {
  const ratio = Math.min(Math.max(position / SLIDER_STEPS, 0), 1);
  return Math.round(bounds.min + (bounds.max - bounds.min) * ratio ** 3);
}

export function priceToSlider(price: number, bounds: { min: number; max: number }): number {
  if (bounds.max <= bounds.min) return 0;
  const ratio = Math.min(Math.max((price - bounds.min) / (bounds.max - bounds.min), 0), 1);
  return Math.round(Math.cbrt(ratio) * SLIDER_STEPS);
}
