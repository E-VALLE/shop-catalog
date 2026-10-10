import { useCallback } from "react";
import { formatPrice } from "../helpers/formatters";
import { useCurrency } from "./use-currency";

/** `formatPrice` já ligado à moeda/cotação ativas; muda de identidade quando elas mudam. */
export function useFormatPrice(): (valueUsd: number) => string {
  const { currency, rate } = useCurrency();
  return useCallback(
    (valueUsd: number) => formatPrice(valueUsd, { currency, rate }),
    [currency, rate],
  );
}
