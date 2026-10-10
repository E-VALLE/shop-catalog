import { useContext } from "react";
import { AdminStoreContext } from "../contexts/admin-store-value";

export function useAdminStore() {
  const context = useContext(AdminStoreContext);
  if (!context) {
    throw new Error("useAdminStore deve ser usado dentro de um <AdminStoreProvider>");
  }
  return context;
}
