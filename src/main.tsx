import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { registerSW } from "virtual:pwa-register";
import "./i18n";
import { AppRouter } from "./app-router";
import { AdminStoreProvider } from "./contexts/admin-store-provider";
import { AuthProvider } from "./contexts/auth-provider";
import { CartProvider } from "./contexts/cart-provider";
import { CompareProvider } from "./contexts/compare-provider";
import { FavoritesProvider } from "./contexts/favorites-provider";
import { RecentlyViewedProvider } from "./contexts/recently-viewed-provider";
import { CurrencyProvider } from "./contexts/currency-provider";
import { createQueryClient } from "./lib/query-client";
import { cssVariablesResolver } from "./theme/css-variables";
import { mantineTheme } from "./theme/mantine-theme";

// Service worker (só existe no build): atualiza sozinho quando há versão nova.
registerSW({ immediate: true });

const queryClient = createQueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider
      theme={mantineTheme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="auto"
    >
      <Notifications position="top-right" />
      <ModalsProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <AuthProvider>
              <CartProvider>
                <FavoritesProvider>
                  <RecentlyViewedProvider>
                    <CompareProvider>
                      <CurrencyProvider>
                        <AdminStoreProvider>
                          <AppRouter />
                        </AdminStoreProvider>
                      </CurrencyProvider>
                    </CompareProvider>
                  </RecentlyViewedProvider>
                </FavoritesProvider>
              </CartProvider>
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ModalsProvider>
    </MantineProvider>
  </StrictMode>,
);
