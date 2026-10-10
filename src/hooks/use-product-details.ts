import { useParams } from "react-router";
import type { Product } from "../schemas/product-schema";
import { getProduct } from "../services/products-service";
import { useApiQuery, type AsyncState } from "./use-api-query";

/** Lê `:id` da rota e carrega o produto. `id` é NaN se o parâmetro for inválido. */
export function useProductDetails(): {
  id: number;
  state: AsyncState<Product>;
} {
  const { id: rawId } = useParams<{ id: string }>();
  const id = Number(rawId);
  const state = useApiQuery(["product", id], (signal) =>
    Number.isInteger(id) && id > 0
      ? getProduct(id, signal)
      : Promise.reject(new Error("Identificador de produto inválido.")),
  );
  return { id, state };
}
