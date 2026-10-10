import { useEffect } from "react";

export const SITE_NAME = "Shop Catalog";

/**
 * Define o título da aba como "Página · Shop Catalog". Sem título (ex.: dados ainda
 * carregando), mostra só o nome do site. Passar o texto já traduzido faz o título
 * acompanhar a troca de idioma.
 */
export function useDocumentTitle(title?: string | null): void {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
  }, [title]);
}
