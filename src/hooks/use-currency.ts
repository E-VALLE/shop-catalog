import { useContext } from "react";
import { CurrencyContext } from "../contexts/currency-context-value";

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency deve ser usado dentro de um <CurrencyProvider>");
  }
  return context;
}
