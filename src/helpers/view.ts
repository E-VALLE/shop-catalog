/** Modo de exibição do catálogo: grade de cartões ou lista detalhada. */
export type ViewMode = "grade" | "lista";

export const VIEW_KEY = "shop-catalog:view";

export const parseView = (value: string | null | undefined): ViewMode | null =>
  value === "grade" || value === "lista" ? value : null;

export function readStoredView(): ViewMode | null {
  try {
    return parseView(localStorage.getItem(VIEW_KEY));
  } catch {
    return null;
  }
}

export function storeView(view: ViewMode): void {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    // sem armazenamento: vale só nesta sessão
  }
}
