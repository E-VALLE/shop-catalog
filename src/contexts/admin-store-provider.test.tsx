import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { useAdminStore } from "../hooks/use-admin-store";
import type { Product } from "../schemas/product-schema";
import { AdminStoreProvider } from "./admin-store-provider";

const make = (id: number, title = `P${id}`): Product => ({
  id,
  title,
  description: "d",
  category: "beauty",
  price: 10,
  thumbnail: "t",
  images: [],
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <AdminStoreProvider>{children}</AdminStoreProvider>
);

describe("AdminStoreProvider", () => {
  it("lança erro fora do Provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAdminStore())).toThrow(/AdminStoreProvider/);
    spy.mockRestore();
  });

  it("cria produtos locais com ids altos e únicos, o mais novo primeiro", () => {
    const { result } = renderHook(() => useAdminStore(), { wrapper });
    act(() => result.current.addCreated(make(0, "A")));
    act(() => result.current.addCreated(make(0, "B")));
    expect(result.current.created.map((p) => p.title)).toEqual(["B", "A"]);
    const ids = result.current.created.map((p) => p.id);
    expect(new Set(ids).size).toBe(2);
    expect(Math.min(...ids)).toBeGreaterThanOrEqual(10_000);
  });

  it("edições valem para produtos da API e para os criados", () => {
    const { result } = renderHook(() => useAdminStore(), { wrapper });
    act(() => result.current.addCreated(make(0, "Novo")));
    const local = result.current.created[0];
    act(() => result.current.saveEdit({ ...local, price: 99 }));
    expect(result.current.created[0].price).toBe(99);

    act(() => result.current.saveEdit(make(5, "Editado")));
    expect(result.current.applyTo([make(5, "Original")])[0].title).toBe("Editado");
  });

  it("excluir esconde da API e remove os criados; restaurar traz tudo de volta", () => {
    const { result } = renderHook(() => useAdminStore(), { wrapper });
    act(() => result.current.addCreated(make(0, "Local")));
    const localId = result.current.created[0].id;

    act(() => {
      result.current.markDeleted(7);
      result.current.markDeleted(localId);
    });
    expect(result.current.applyTo([make(7), make(8)]).map((p) => p.id)).toEqual([8]);
    expect(result.current.created).toEqual([]);

    act(() => result.current.restoreDeleted([7, localId]));
    expect(result.current.applyTo([make(7), make(8)]).map((p) => p.id)).toEqual([7, 8]);
    expect(result.current.created.map((p) => p.title)).toEqual(["Local"]);
  });

  it("restaurar usa o estado mais recente mesmo se a função foi guardada antes (ex.: botão Desfazer)", () => {
    const { result } = renderHook(() => useAdminStore(), { wrapper });
    act(() => result.current.addCreated(make(0, "Local")));
    const localId = result.current.created[0].id;

    // funções capturadas ANTES da exclusão, como numa notificação que fica na tela
    const { markDeleted, restoreDeleted } = result.current;
    act(() => markDeleted(localId));
    expect(result.current.created).toEqual([]);

    act(() => restoreDeleted([localId]));
    expect(result.current.created.map((p) => p.title)).toEqual(["Local"]);
  });

  it("novos produtos depois de excluir um não reaproveitam o id", () => {
    const { result } = renderHook(() => useAdminStore(), { wrapper });
    act(() => result.current.addCreated(make(0, "A")));
    const first = result.current.created[0].id;
    act(() => result.current.markDeleted(first));
    act(() => result.current.addCreated(make(0, "B")));
    expect(result.current.created[0].id).not.toBe(first);
  });

  it("restaurar ids desconhecidos não faz nada", () => {
    const { result } = renderHook(() => useAdminStore(), { wrapper });
    const before = result.current.created;
    act(() => result.current.restoreDeleted([123]));
    expect(result.current.created).toBe(before);
  });
});
