import { createContext } from "react";

export interface RecentlyViewedContextValue {
  /** Ids dos produtos vistos, do mais recente para o mais antigo. */
  ids: number[];
  record: (id: number) => void;
  clear: () => void;
}

export const RecentlyViewedContext = createContext<RecentlyViewedContextValue | null>(null);
