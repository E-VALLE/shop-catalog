import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { storedFavoritesSchema } from "../schemas/favorites-schema";
import {
  CompareContext,
  MAX_COMPARE,
  type CompareContextValue,
  type CompareToggleResult,
} from "./compare-context-value";

export const COMPARE_KEY = "shop-catalog:compare";

function readStored(): number[] {
  try {
    const raw = localStorage.getItem(COMPARE_KEY);
    const parsed = storedFavoritesSchema.safeParse(raw ? JSON.parse(raw) : []);
    return parsed.success ? [...new Set(parsed.data)].slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<number[]>(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(COMPARE_KEY, JSON.stringify(ids));
    } catch {
      // sem armazenamento: a seleção vale só nesta sessão
    }
  }, [ids]);

  const toggle = useCallback(
    (id: number): CompareToggleResult => {
      if (ids.includes(id)) {
        setIds(ids.filter((x) => x !== id));
        return "removed";
      }
      if (ids.length >= MAX_COMPARE) return "full";
      setIds([...ids, id]);
      return "added";
    },
    [ids],
  );

  const remove = useCallback(
    (id: number) => setIds((current) => current.filter((x) => x !== id)),
    [],
  );
  const clear = useCallback(() => setIds([]), []);

  const value = useMemo<CompareContextValue>(
    () => ({
      ids,
      count: ids.length,
      isComparing: (id) => ids.includes(id),
      toggle,
      remove,
      clear,
    }),
    [ids, toggle, remove, clear],
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}
