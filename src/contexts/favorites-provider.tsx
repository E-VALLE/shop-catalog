import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { storedFavoritesSchema } from "../schemas/favorites-schema";
import { FavoritesContext } from "./favorites-context-value";

export const FAVORITES_KEY = "shop-catalog:favorites";

function readStoredFavorites(): number[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed = storedFavoritesSchema.safeParse(raw ? JSON.parse(raw) : []);
    // remove duplicados preservando a ordem
    return parsed.success ? [...new Set(parsed.data)] : [];
  } catch {
    return [];
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<number[]>(readStoredFavorites);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
    } catch {
      // armazenamento indisponível: os favoritos seguem apenas em memória
    }
  }, [ids]);

  // Mantém várias abas em sincronia.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === FAVORITES_KEY) setIds(readStoredFavorites());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useCallback((id: number) => {
    setIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [id, ...current],
    );
  }, []);

  const value = useMemo(
    () => ({
      ids,
      count: ids.length,
      isFavorite: (id: number) => ids.includes(id),
      toggle,
    }),
    [ids, toggle],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}
