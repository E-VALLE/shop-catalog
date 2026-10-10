import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createQueryClient } from "../lib/query-client";
import { useApiQuery } from "./use-api-query";

function setup() {
  const client = createQueryClient({ retry: false });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe("useApiQuery", () => {
  it("passa de loading para success", async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useApiQuery(["a"], () => Promise.resolve(42)), { wrapper });
    expect(result.current.status).toBe("loading");
    await waitFor(() =>
      expect(result.current).toEqual({ status: "success", data: 42, error: null }),
    );
  });

  it("converte falhas em mensagem amigável", async () => {
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useApiQuery(["b"], () => Promise.reject(new Error("boom"))),
      { wrapper },
    );
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toMatch(/erro inesperado/i);
  });

  it("compartilha o cache entre consumidores da mesma chave (uma só requisição)", async () => {
    const { wrapper } = setup();
    const fetcher = vi.fn().mockResolvedValue(["beauty"]);
    const first = renderHook(() => useApiQuery(["categories"], fetcher), { wrapper });
    await waitFor(() => expect(first.result.current.status).toBe("success"));
    const second = renderHook(() => useApiQuery(["categories"], fetcher), { wrapper });
    expect(second.result.current.status).toBe("success"); // já no cache, sem loading
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("não executa quando enabled é falso", () => {
    const { wrapper } = setup();
    const fetcher = vi.fn().mockResolvedValue(1);
    const { result } = renderHook(() => useApiQuery(["c"], fetcher, { enabled: false }), {
      wrapper,
    });
    expect(result.current.status).toBe("loading");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("refaz a busca quando a chave muda", async () => {
    const { wrapper } = setup();
    const fetcher = vi.fn((signal: AbortSignal) => Promise.resolve(signal.aborted ? 0 : 1));
    const { result, rerender } = renderHook(({ page }) => useApiQuery(["p", page], fetcher), {
      wrapper,
      initialProps: { page: 1 },
    });
    await waitFor(() => expect(result.current.status).toBe("success"));
    rerender({ page: 2 });
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
