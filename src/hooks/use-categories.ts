import type { Category } from "../schemas/product-schema";
import { listCategories } from "../services/products-service";
import { useApiQuery, type AsyncState } from "./use-api-query";

/** Categorias mudam raramente: cache longo e uma única requisição compartilhada entre telas. */
export function useCategories(): AsyncState<Category[]> {
  return useApiQuery(["categories"], listCategories, { staleTime: 30 * 60_000 });
}
