import { createContext } from "react";

/** Máximo de produtos comparados ao mesmo tempo (mais colunas não cabem na tela). */
export const MAX_COMPARE = 3;

export type CompareToggleResult = "added" | "removed" | "full";

export interface CompareContextValue {
  ids: number[];
  count: number;
  isComparing: (id: number) => boolean;
  /** Adiciona/remove. Devolve "full" (sem alterar nada) se já há `MAX_COMPARE` produtos. */
  toggle: (id: number) => CompareToggleResult;
  remove: (id: number) => void;
  clear: () => void;
}

export const CompareContext = createContext<CompareContextValue | null>(null);
