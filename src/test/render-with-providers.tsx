import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { AdminStoreProvider } from "../contexts/admin-store-provider";
import { AuthProvider } from "../contexts/auth-provider";
import { CartProvider } from "../contexts/cart-provider";
import { CompareProvider } from "../contexts/compare-provider";
import { FavoritesProvider } from "../contexts/favorites-provider";
import { RecentlyViewedProvider } from "../contexts/recently-viewed-provider";
import { CurrencyProvider } from "../contexts/currency-provider";
import type { UsdBrlQuote } from "../services/exchange-service";
import { createQueryClient } from "../lib/query-client";
import { mantineTheme } from "../theme/mantine-theme";

interface RenderOptions {
  route?: string;
  /** `location.state` da rota inicial (ex.: retorno do login). */
  state?: unknown;
  /** Cotação injetada (padrão: US$ 1 = R$ 5, sem rede). */
  fetchQuote?: (signal: AbortSignal) => Promise<UsdBrlQuote>;
}

const defaultQuote = () => Promise.resolve({ rate: 5, quotedAt: "2026-10-02T12:00:00.000Z" });

export function renderWithProviders(
  ui: ReactElement,
  { route = "/", state, fetchQuote = defaultQuote }: RenderOptions = {},
) {
  // Cliente novo por render: sem cache compartilhado entre testes e sem retry.
  const queryClient = createQueryClient({ retry: false });
  const [path, query = ""] = route.split("?"); // aceita "/produtos?marca=X"
  const search = query ? `?${query}` : "";
  return render(
    <MantineProvider theme={mantineTheme} env="test">
      <Notifications />
      <QueryClientProvider client={queryClient}>
        <ModalsProvider>
          <MemoryRouter initialEntries={[{ pathname: path, search, state }]}>
            <AuthProvider>
              <CartProvider>
                <FavoritesProvider>
                  <RecentlyViewedProvider>
                    <CompareProvider>
                      <CurrencyProvider fetchQuote={fetchQuote}>
                        <AdminStoreProvider>{ui}</AdminStoreProvider>
                      </CurrencyProvider>
                    </CompareProvider>
                  </RecentlyViewedProvider>
                </FavoritesProvider>
              </CartProvider>
            </AuthProvider>
          </MemoryRouter>
        </ModalsProvider>
      </QueryClientProvider>
    </MantineProvider>,
  );
}
