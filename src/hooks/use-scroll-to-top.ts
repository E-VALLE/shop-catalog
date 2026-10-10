import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router";

/**
 * Leva a página ao topo quando o usuário navega para OUTRA rota (ex.: de uma lista rolada para os
 * detalhes de um produto). O React Router (modo declarativo) não faz isso sozinho, então a página
 * nova herdava a rolagem da anterior e abria no meio do conteúdo.
 *
 * Não age em: primeira renderização, voltar/avançar (o navegador restaura a posição) e mudanças só
 * de busca/filtro/página na mesma rota (essas têm tratamento próprio, como `useScrollOnChange`).
 */
export function useScrollToTop(): void {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const previousPath = useRef(pathname);

  useEffect(() => {
    const changedRoute = previousPath.current !== pathname;
    previousPath.current = pathname;
    if (changedRoute && navigationType !== "POP") window.scrollTo(0, 0);
  }, [pathname, navigationType]);
}
