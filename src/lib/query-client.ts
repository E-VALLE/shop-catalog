import { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { InvalidResponseError } from "../services/products-service";

/** Só vale repetir falhas transitórias (rede/5xx); 4xx e respostas inválidas não melhoram ao repetir. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof InvalidResponseError) return false;
  if (isAxiosError(error) && error.response && error.response.status < 500) return false;
  return failureCount < 1;
}

export function createQueryClient(overrides?: { retry?: boolean }): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: overrides?.retry === false ? false : shouldRetry,
        refetchOnWindowFocus: false,
      },
    },
  });
}
