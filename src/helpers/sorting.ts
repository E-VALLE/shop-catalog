import type { Product } from "../schemas/product-schema";
import { discountedPrice } from "./formatters";

/** Opções do seletor da loja. */
export const PUBLIC_SORT_KEYS = ["preco-asc", "preco-desc", "avaliacao", "nome"] as const;

/**
 * Ordenações extras do admin (cabeçalhos da tabela). Lá o preço mostrado é o de TABELA, sem
 * desconto, por isso `tabela-*` (a API ordena por `price`) é diferente de `preco-*` (com desconto).
 */
const ADMIN_SORT_KEYS = [
  "nome-desc",
  "tabela-asc",
  "tabela-desc",
  "estoque-asc",
  "estoque-desc",
  "categoria-asc",
  "categoria-desc",
] as const;

/** Valores aceitos em `?ordem=`. Ausente = relevância (ordem padrão da API). */
export const SORT_KEYS = [...PUBLIC_SORT_KEYS, ...ADMIN_SORT_KEYS] as const;
export type SortKey = (typeof SORT_KEYS)[number];

/** Parâmetros `sortBy`/`order` da DummyJSON para cada ordenação. */
export const SORT_API_PARAMS: Record<SortKey, { sortBy: string; order: "asc" | "desc" }> = {
  "preco-asc": { sortBy: "price", order: "asc" },
  "preco-desc": { sortBy: "price", order: "desc" },
  avaliacao: { sortBy: "rating", order: "desc" },
  nome: { sortBy: "title", order: "asc" },
  "nome-desc": { sortBy: "title", order: "desc" },
  "tabela-asc": { sortBy: "price", order: "asc" },
  "tabela-desc": { sortBy: "price", order: "desc" },
  "estoque-asc": { sortBy: "stock", order: "asc" },
  "estoque-desc": { sortBy: "stock", order: "desc" },
  "categoria-asc": { sortBy: "category", order: "asc" },
  "categoria-desc": { sortBy: "category", order: "desc" },
};

/**
 * A API ordena pelo preço de tabela, mas a tela mostra o preço COM desconto; ordenar pelo
 * valor errado deixaria a lista visivelmente fora de ordem. Por isso preço é ordenado no cliente.
 */
export const isPriceSort = (key: SortKey | null): boolean =>
  key === "preco-asc" || key === "preco-desc";

const finalPrice = (product: Product) => discountedPrice(product.price, product.discountPercentage);

/** Valida o valor vindo da URL: qualquer coisa fora da lista vira "sem ordenação". */
const isSortKey = (value: unknown): value is SortKey => SORT_KEYS.some((key) => key === value);

export function parseSort(value: string | null | undefined): SortKey | null {
  return isSortKey(value) ? value : null;
}

const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

/** Ordenação local (usada quando a lista é filtrada no cliente). Não altera o array original. */
export function sortProducts(products: Product[], key: SortKey | null): Product[] {
  if (!key) return products;
  const copy = [...products];
  switch (key) {
    case "preco-asc":
      return copy.sort((a, b) => finalPrice(a) - finalPrice(b));
    case "preco-desc":
      return copy.sort((a, b) => finalPrice(b) - finalPrice(a));
    case "avaliacao":
      return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case "nome":
      return copy.sort((a, b) => collator.compare(a.title, b.title));
    case "nome-desc":
      return copy.sort((a, b) => collator.compare(b.title, a.title));
    case "tabela-asc":
      return copy.sort((a, b) => a.price - b.price);
    case "tabela-desc":
      return copy.sort((a, b) => b.price - a.price);
    case "estoque-asc":
      return copy.sort((a, b) => (a.stock ?? Infinity) - (b.stock ?? Infinity));
    case "estoque-desc":
      return copy.sort((a, b) => (b.stock ?? -Infinity) - (a.stock ?? -Infinity));
    case "categoria-asc":
      return copy.sort((a, b) => collator.compare(a.category, b.category));
    case "categoria-desc":
      return copy.sort((a, b) => collator.compare(b.category, a.category));
  }
}
