import { useEffect, useRef, type RefObject } from "react";

/**
 * Ao mudar `value` (ex.: página da lista) volta ao topo e move o foco para o título,
 * para quem usa teclado ou leitor de tela começar do início do novo conteúdo.
 * Não age na primeira renderização.
 */
export function useScrollOnChange(value: unknown, headingRef: RefObject<HTMLElement | null>): void {
  const previous = useRef(value);

  useEffect(() => {
    if (Object.is(previous.current, value)) return;
    previous.current = value;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    headingRef.current?.focus({ preventScroll: true });
  }, [value, headingRef]);
}
