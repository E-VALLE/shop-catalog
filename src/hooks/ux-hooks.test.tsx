import { act, renderHook } from "@testing-library/react";
import { SITE_NAME, useDocumentTitle } from "./use-document-title";
import { useScrollOnChange } from "./use-scroll-on-change";

describe("useDocumentTitle", () => {
  it("monta 'Página · Shop Catalog' e acompanha mudanças", () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: "Carrinho" as string | null | undefined },
    });
    expect(document.title).toBe(`Carrinho · ${SITE_NAME}`);

    rerender({ title: "Cart" }); // troca de idioma
    expect(document.title).toBe(`Cart · ${SITE_NAME}`);
  });

  it.each([null, undefined, ""])("sem título (%j) mostra só o nome do site", (title) => {
    renderHook(() => useDocumentTitle(title));
    expect(document.title).toBe(SITE_NAME);
  });
});

describe("useScrollOnChange", () => {
  const matchMedia = window.matchMedia;
  afterEach(() => {
    window.matchMedia = matchMedia;
    vi.mocked(window.scrollTo).mockClear();
  });

  const heading = () => {
    const element = document.createElement("h1");
    element.tabIndex = -1;
    document.body.appendChild(element);
    return { current: element };
  };

  it("não rola na primeira renderização", () => {
    renderHook(() => useScrollOnChange(1, heading()));
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("ao mudar o valor, volta ao topo (suave) e foca o título", () => {
    const ref = heading();
    const { rerender } = renderHook(({ page }) => useScrollOnChange(page, ref), {
      initialProps: { page: 1 },
    });
    act(() => rerender({ page: 2 }));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    expect(document.activeElement).toBe(ref.current);
  });

  it("respeita prefers-reduced-motion (sem animação)", () => {
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
    })) as typeof window.matchMedia;
    const { rerender } = renderHook(({ page }) => useScrollOnChange(page, heading()), {
      initialProps: { page: 1 },
    });
    rerender({ page: 2 });
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
  });

  it("não rola quando o valor se repete", () => {
    const ref = heading();
    const { rerender } = renderHook(({ page }) => useScrollOnChange(page, ref), {
      initialProps: { page: 3 },
    });
    rerender({ page: 3 });
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
