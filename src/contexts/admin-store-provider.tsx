import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { Product } from "../schemas/product-schema";
import { LOCAL_ID_START } from "../helpers/ids";
import { AdminStoreContext } from "./admin-store-value";

interface LocalProducts {
  /** Criados nesta sessão (a API só simula a criação). */
  created: Product[];
  /** Criados e depois excluídos: guardados para o "Desfazer". */
  removed: Product[];
}

export function AdminStoreProvider({ children }: { children: ReactNode }) {
  // `created` e `removed` mudam juntos (excluir move de um para o outro); um único estado
  // atualizado de forma funcional evita ler valores velhos em callbacks guardados (ex.: "Desfazer").
  const [local, setLocal] = useState<LocalProducts>({ created: [], removed: [] });
  const [edited, setEdited] = useState<Record<number, Product>>({});
  const [deletedIds, setDeletedIds] = useState<number[]>([]);

  const addCreated = useCallback((product: Product) => {
    setLocal((current) => ({
      ...current,
      created: [
        { ...product, id: LOCAL_ID_START + current.created.length + current.removed.length + 1 },
        ...current.created,
      ],
    }));
  }, []);

  const saveEdit = useCallback((product: Product) => {
    setLocal((current) => ({
      ...current,
      created: current.created.map((p) => (p.id === product.id ? product : p)),
    }));
    setEdited((current) => ({ ...current, [product.id]: product }));
  }, []);

  const markDeleted = useCallback((id: number) => {
    setLocal((current) => {
      const product = current.created.find((p) => p.id === id);
      return product
        ? {
            created: current.created.filter((p) => p.id !== id),
            removed: [product, ...current.removed],
          }
        : current;
    });
    setDeletedIds((current) => (current.includes(id) ? current : [...current, id]));
  }, []);

  const restoreDeleted = useCallback((ids: number[]) => {
    setLocal((current) => {
      const back = current.removed.filter((p) => ids.includes(p.id));
      return back.length === 0
        ? current
        : {
            created: [...back, ...current.created],
            removed: current.removed.filter((p) => !ids.includes(p.id)),
          };
    });
    setDeletedIds((current) => current.filter((id) => !ids.includes(id)));
  }, []);

  const applyTo = useCallback(
    (products: Product[]) =>
      products.filter((p) => !deletedIds.includes(p.id)).map((p) => edited[p.id] ?? p),
    [deletedIds, edited],
  );

  const created = local.created;
  const value = useMemo(
    () => ({
      created,
      edited,
      deletedIds,
      addCreated,
      saveEdit,
      markDeleted,
      restoreDeleted,
      applyTo,
    }),
    [created, edited, deletedIds, addCreated, saveEdit, markDeleted, restoreDeleted, applyTo],
  );

  return <AdminStoreContext.Provider value={value}>{children}</AdminStoreContext.Provider>;
}
