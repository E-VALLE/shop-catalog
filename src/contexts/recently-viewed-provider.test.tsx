import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { useRecentlyViewed } from "../hooks/use-recently-viewed";
import { RECENT_KEY, RECENT_LIMIT, RecentlyViewedProvider } from "./recently-viewed-provider";

const wrapper = ({ children }: { children: ReactNode }) => (
  <RecentlyViewedProvider>{children}</RecentlyViewedProvider>
);
const stored = () => JSON.parse(localStorage.getItem(RECENT_KEY) ?? "null");

describe("RecentlyViewedProvider", () => {
  it("lança erro fora do Provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useRecentlyViewed())).toThrow(/RecentlyViewedProvider/);
    spy.mockRestore();
  });

  it("registra do mais recente para o mais antigo e persiste", () => {
    const { result } = renderHook(() => useRecentlyViewed(), { wrapper });
    act(() => result.current.record(1));
    act(() => result.current.record(2));
    act(() => result.current.record(3));
    expect(result.current.ids).toEqual([3, 2, 1]);
    expect(stored()).toEqual([3, 2, 1]);
  });

  it("rever um produto o move para a frente, sem duplicar", () => {
    const { result } = renderHook(() => useRecentlyViewed(), { wrapper });
    act(() => result.current.record(1));
    act(() => result.current.record(2));
    act(() => result.current.record(1));
    expect(result.current.ids).toEqual([1, 2]);
  });

  it("registrar o mesmo produto em sequência não altera a lista", () => {
    const { result } = renderHook(() => useRecentlyViewed(), { wrapper });
    act(() => result.current.record(4));
    const before = result.current.ids;
    act(() => result.current.record(4));
    expect(result.current.ids).toBe(before); // mesma referência: nada de re-render à toa
  });

  it(`guarda no máximo ${RECENT_LIMIT} produtos (descarta os mais antigos)`, () => {
    const { result } = renderHook(() => useRecentlyViewed(), { wrapper });
    for (let id = 1; id <= 12; id++) act(() => result.current.record(id));
    expect(result.current.ids).toHaveLength(RECENT_LIMIT);
    expect(result.current.ids[0]).toBe(12);
    expect(result.current.ids).not.toContain(1);
  });

  it("restaura do localStorage (limitando e removendo duplicados)", () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify([5, 5, 6, 7, 8, 9, 10, 11, 12, 13]));
    const { result } = renderHook(() => useRecentlyViewed(), { wrapper });
    expect(result.current.ids).toEqual([5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it.each([
    ["JSON corrompido", "{ruim"],
    ["não é lista", JSON.stringify({ a: 1 })],
    ["ids inválidos", JSON.stringify([1, "x", -3])],
  ])("ignora dados salvos inválidos (%s)", (_label, raw) => {
    localStorage.setItem(RECENT_KEY, raw);
    const { result } = renderHook(() => useRecentlyViewed(), { wrapper });
    expect(result.current.ids).toEqual([]);
  });

  it("clear esvazia o histórico", () => {
    const { result } = renderHook(() => useRecentlyViewed(), { wrapper });
    act(() => result.current.record(1));
    act(() => result.current.clear());
    expect(result.current.ids).toEqual([]);
    expect(stored()).toEqual([]);
  });
});
