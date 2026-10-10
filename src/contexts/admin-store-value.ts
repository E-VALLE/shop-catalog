import { createContext } from "react";
import type { Product } from "../schemas/product-schema";

/**
 * A DummyJSON não persiste escritas. Este store guarda localmente as
 * alterações do admin (criação, edição, exclusão) durante a sessão.
 */
export interface AdminStoreValue {
  created: Product[];
  edited: Record<number, Product>;
  deletedIds: number[];
  addCreated: (product: Product) => void;
  saveEdit: (product: Product) => void;
  markDeleted: (id: number) => void;
  /** Desfaz exclusões (inclusive de produtos criados na sessão). */
  restoreDeleted: (ids: number[]) => void;
  applyTo: (products: Product[]) => Product[];
}

export const AdminStoreContext = createContext<AdminStoreValue | null>(null);
