import { createContext } from "react";

export interface FavoritesContextValue {
  /** Ids favoritados, do mais recente para o mais antigo. */
  ids: number[];
  count: number;
  isFavorite: (id: number) => boolean;
  toggle: (id: number) => void;
}

export const FavoritesContext = createContext<FavoritesContextValue | null>(null);
