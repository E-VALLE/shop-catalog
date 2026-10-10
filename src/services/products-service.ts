import {
  categoriesResponseSchema,
  productSchema,
  productsResponseSchema,
  type Category,
  type Product,
  type ProductFormValues,
  type ProductsResponse,
} from "../schemas/product-schema";
import { applyFilters, hasActiveFilters, type ProductFilters } from "../helpers/filters";
import { SORT_API_PARAMS, isPriceSort, sortProducts, type SortKey } from "../helpers/sorting";
import { api } from "./api";

export const PAGE_SIZE = 12;

export interface ListProductsParams {
  search?: string;
  category?: string | null;
  /** Filtro exato por marca (a API não oferece), aplicado no cliente. */
  brand?: string | null;
  /** Ordenação; no servidor usa `sortBy`/`order`, no filtro local ordena depois de filtrar. */
  sort?: SortKey | null;
  /** Faixa de preço, avaliação mínima e só em estoque (aplicados no cliente, sobre o preço com desconto). */
  filters?: ProductFilters;
  page?: number;
  limit?: number;
  signal?: AbortSignal;
}

export class InvalidResponseError extends Error {
  constructor(resource: string) {
    super(`Resposta inválida da API em ${resource}.`);
    this.name = "InvalidResponseError";
  }
}

const sameBrand = (a?: string, b?: string | null) =>
  a !== undefined && b != null && a.trim().toLowerCase() === b.trim().toLowerCase();

export async function listProducts({
  search = "",
  category = null,
  brand = null,
  sort = null,
  filters,
  page = 1,
  limit = PAGE_SIZE,
  signal,
}: ListProductsParams = {}): Promise<ProductsResponse> {
  const term = search.trim();
  // A API não filtra por marca, não combina busca com categoria e ordena por preço de tabela
  // (sem desconto): nesses casos buscamos o escopo inteiro (o catálogo tem ~200 itens), filtramos aqui e paginamos localmente.
  const clientSide =
    Boolean(brand) || Boolean(term && category) || isPriceSort(sort) || hasActiveFilters(filters);
  const skip = clientSide ? 0 : Math.max(page - 1, 0) * limit;
  const requestLimit = clientSide ? 0 : limit;

  const url = term
    ? "/products/search"
    : category
      ? `/products/category/${encodeURIComponent(category)}`
      : "/products";
  const { data } = await api.get<unknown>(url, {
    params: {
      q: term || undefined,
      limit: requestLimit,
      skip,
      ...(sort && !clientSide ? SORT_API_PARAMS[sort] : {}),
    },
    signal,
  });
  const parsed = productsResponseSchema.safeParse(data);
  if (!parsed.success) throw new InvalidResponseError("produtos");
  if (!clientSide) return parsed.data;

  const filtered = sortProducts(
    applyFilters(
      parsed.data.products.filter(
        (product) =>
          (!category || product.category === category) &&
          (!brand || sameBrand(product.brand, brand)),
      ),
      filters,
    ),
    sort,
  );
  const offset = Math.max(page - 1, 0) * limit;
  return {
    products: filtered.slice(offset, offset + limit),
    total: filtered.length,
    skip: offset,
    limit,
  };
}

export async function getProduct(id: number, signal?: AbortSignal): Promise<Product> {
  const { data } = await api.get<unknown>(`/products/${id}`, { signal });
  const parsed = productSchema.safeParse(data);
  if (!parsed.success) throw new InvalidResponseError("produto");
  return parsed.data;
}

/** Produtos com os maiores descontos (ordenação feita pela API: `sortBy=discountPercentage`). */
export async function listTopDiscounts(limit = 4, signal?: AbortSignal): Promise<Product[]> {
  const { data } = await api.get<unknown>("/products", {
    params: { sortBy: "discountPercentage", order: "desc", limit },
    signal,
  });
  const parsed = productsResponseSchema.safeParse(data);
  if (!parsed.success) throw new InvalidResponseError("promoções");
  return parsed.data.products;
}

export async function listCategories(signal?: AbortSignal): Promise<Category[]> {
  const { data } = await api.get<unknown>("/products/categories", { signal });
  const parsed = categoriesResponseSchema.safeParse(data);
  if (!parsed.success) throw new InvalidResponseError("categorias");
  return parsed.data;
}

// A DummyJSON simula escrita: responde 200/201 mas não persiste os dados.
export async function createProduct(values: ProductFormValues): Promise<Product> {
  const { data } = await api.post<{ id?: number }>("/products/add", values);
  return { id: data.id ?? 0, thumbnail: "", images: [], ...values };
}

export async function updateProduct(id: number, values: ProductFormValues): Promise<Product> {
  await api.put(`/products/${id}`, values);
  return { id, thumbnail: "", images: [], ...values };
}

export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/products/${id}`);
}
