import { useContext } from "react";
import { CompareContext } from "../contexts/compare-context-value";

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error("useCompare deve ser usado dentro de um <CompareProvider>");
  }
  return context;
}
