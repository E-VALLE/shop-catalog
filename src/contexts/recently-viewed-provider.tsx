import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { storedFavoritesSchema } from "../schemas/favorites-schema";
import { RecentlyViewedContext } from "./recently-viewed-context-value";

export const RECENT_KEY = "shop-catalog:recent";
export const RECENT_LIMIT = 8;

function readStored(): number[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = storedFavoritesSchema.safeParse(raw ? JSON.parse(raw) : []);
    return parsed.success ? [...new Set(parsed.data)].slice(0, RECENT_LIMIT) : [];
  } catch {
    return [];
  }
}

export function RecentlyViewedProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<number[]>(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(ids));
    } catch {
      // sem armazenamento: o histórico vale só nesta sessão
    }
  }, [ids]);

  const record = useCallback((id: number) => {
    setIds((current) =>
      current[0] === id
        ? current // já é o mais recente: evita re-render
        : [id, ...current.filter((x) => x !== id)].slice(0, RECENT_LIMIT),
    );
  }, []);

  const clear = useCallback(() => setIds([]), []);

  const value = useMemo(() => ({ ids, record, clear }), [ids, record, clear]);
  return <RecentlyViewedContext.Provider value={value}>{children}</RecentlyViewedContext.Provider>;
}
