import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { useFavorites } from "../hooks/use-favorites";
import { FAVORITES_KEY, FavoritesProvider } from "./favorites-provider";

const wrapper = ({ children }: { children: ReactNode }) => (
  <FavoritesProvider>{children}</FavoritesProvider>
);
const stored = () => JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "null");

describe("useFavorites / FavoritesProvider", () => {
  it("lança erro fora do Provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useFavorites())).toThrow(/FavoritesProvider/);
    spy.mockRestore();
  });

  it("alterna favorito, com o mais recente primeiro, e persiste", () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });
    act(() => result.current.toggle(5));
    act(() => result.current.toggle(9));
    expect(result.current.ids).toEqual([9, 5]);
    expect(result.current.count).toBe(2);
    expect(result.current.isFavorite(5)).toBe(true);
    expect(stored()).toEqual([9, 5]);

    act(() => result.current.toggle(5)); // remove
    expect(result.current.ids).toEqual([9]);
    expect(result.current.isFavorite(5)).toBe(false);
    expect(stored()).toEqual([9]);
  });

  it("restaura do localStorage e remove duplicados", () => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([3, 7, 3]));
    const { result } = renderHook(() => useFavorites(), { wrapper });
    expect(result.current.ids).toEqual([3, 7]);
  });

  it.each([
    ["JSON corrompido", "{ruim"],
    ["não é lista", JSON.stringify({ a: 1 })],
    ["ids inválidos", JSON.stringify([1, "x", -2, 1.5])],
  ])("ignora dados salvos inválidos (%s)", (_label, raw) => {
    localStorage.setItem(FAVORITES_KEY, raw);
    const { result } = renderHook(() => useFavorites(), { wrapper });
    expect(result.current.ids).toEqual([]);
  });

  it("sincroniza com outra aba pelo evento storage", () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });
    act(() => {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([42]));
      window.dispatchEvent(new StorageEvent("storage", { key: FAVORITES_KEY }));
    });
    expect(result.current.ids).toEqual([42]);
  });

  it("segue funcionando em memória se o localStorage falhar ao gravar", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("cheio");
    });
    const { result } = renderHook(() => useFavorites(), { wrapper });
    act(() => result.current.toggle(1));
    expect(result.current.ids).toEqual([1]);
    vi.restoreAllMocks();
  });
});
