import { useContext } from "react";
import { RecentlyViewedContext } from "../contexts/recently-viewed-context-value";

export function useRecentlyViewed() {
  const context = useContext(RecentlyViewedContext);
  if (!context) {
    throw new Error("useRecentlyViewed deve ser usado dentro de um <RecentlyViewedProvider>");
  }
  return context;
}
