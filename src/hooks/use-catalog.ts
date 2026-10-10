import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import type { Category, ProductsResponse } from "../schemas/product-schema";
import { PAGE_SIZE, listProducts } from "../services/products-service";
import { filtersToParams, parseFilters, type ProductFilters } from "../helpers/filters";
import { parseSort, type SortKey } from "../helpers/sorting";
import { parseView, readStoredView, storeView, type ViewMode } from "../helpers/view";
import { useApiQuery, type AsyncState } from "./use-api-query";
import { useCategories } from "./use-categories";
import { useDebounce } from "./use-debounce";

export interface UseCatalogResult {
  searchInput: string;
  setSearchInput: (value: string) => void;
  category: string | null;
  setCategory: (value: string | null) => void;
  view: ViewMode;
  setView: (view: ViewMode) => void;
  filters: ProductFilters;
  /** Atualiza só os filtros informados (e volta para a página 1). */
  setFilters: (changes: Partial<ProductFilters>) => void;
  clearFilters: () => void;
  sort: SortKey | null;
  setSort: (value: string | null) => void;
  brand: string | null;
  clearBrand: () => void;
  /** Remove categoria e marca de uma vez (ex.: "ver todos da marca" usa só a marca). */
  clearCategory: () => void;
  page: number;
  setPage: (value: number) => void;
  totalPages: number;
  products: AsyncState<ProductsResponse>;
  categories: Category[];
}

/** Estado do catálogo (busca, categoria e página) sincronizado com a URL. */
export function useCatalog(): UseCatalogResult {
  const [params, setParams] = useSearchParams();
  const search = params.get("q") ?? "";
  const category = params.get("categoria");
  const brand = params.get("marca");
  const sort = parseSort(params.get("ordem"));
  // A URL manda (link compartilhado); sem ela vale a última escolha do usuário; padrão: grade.
  const view: ViewMode = parseView(params.get("vista")) ?? readStoredView() ?? "grade";
  const filters = useMemo(() => parseFilters(new URLSearchParams(params)), [params]);
  const rawPage = Number(params.get("pagina"));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput.trim());

  const update = useCallback(
    (changes: Record<string, string | null>) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  // Aplica a busca (já com debounce) na URL e volta para a página 1.
  useEffect(() => {
    if (debouncedSearch !== search) {
      update({ q: debouncedSearch || null, pagina: null });
    }
  }, [debouncedSearch, search, update]);

  const products = useApiQuery(
    ["products", { search, category, brand, sort, filters, page }],
    (signal) => listProducts({ search, category, brand, sort, filters, page, signal }),
  );
  const categoriesState = useCategories();

  const totalPages =
    products.status === "success" ? Math.max(1, Math.ceil(products.data.total / PAGE_SIZE)) : 1;

  return {
    searchInput,
    setSearchInput,
    category,
    setCategory: (value) => update({ categoria: value, pagina: null }),
    view,
    setView: (next) => {
      storeView(next);
      update({ vista: next });
    },
    filters,
    setFilters: (changes) =>
      update({ ...filtersToParams({ ...filters, ...changes }), pagina: null }),
    clearFilters: () => update({ ...filtersToParams({}), pagina: null }),
    sort,
    setSort: (value) => update({ ordem: parseSort(value), pagina: null }),
    brand,
    clearBrand: () => update({ marca: null, pagina: null }),
    clearCategory: () => update({ categoria: null, pagina: null }),
    page,
    setPage: (value) => update({ pagina: value > 1 ? String(value) : null }),
    totalPages,
    products,
    categories: categoriesState.status === "success" ? categoriesState.data : [],
  };
}
