import { useQuery, type QueryKey } from "@tanstack/react-query";
import { getApiErrorMessage } from "../services/api";

export type AsyncState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: null; error: string; retry: () => void };

interface ApiQueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

/**
 * Leitura de dados da API com cache e cancelamento (TanStack Query), devolvendo o
 * formato `AsyncState` usado pelas telas: loading / success / error com mensagem amigável.
 */
export function useApiQuery<T>(
  queryKey: QueryKey,
  queryFn: (signal: AbortSignal) => Promise<T>,
  { enabled = true, staleTime }: ApiQueryOptions = {},
): AsyncState<T> {
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => queryFn(signal),
    enabled,
    // `undefined` explícito sobrescreveria o staleTime padrão do QueryClient
    ...(staleTime !== undefined && { staleTime }),
  });

  if (query.isError) {
    return {
      status: "error",
      data: null,
      error: getApiErrorMessage(query.error),
      retry: () => void query.refetch(),
    };
  }
  if (query.isSuccess) return { status: "success", data: query.data, error: null };
  return { status: "loading", data: null, error: null };
}
