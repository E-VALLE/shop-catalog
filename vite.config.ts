import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // PWA básico: instalável + shell e dados já visitados disponíveis offline (ver README).
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icon.svg"],
      manifest: {
        name: "Shop Catalog",
        short_name: "Shop Catalog",
        description: "Catálogo de produtos com carrinho, favoritos e painel administrativo.",
        lang: "pt-BR",
        start_url: "/shop-catalog/",
        scope: "/shop-catalog/",
        display: "standalone",
        theme_color: "#5f3dc4",
        background_color: "#ffffff",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/shop-catalog/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        runtimeCaching: [
          {
            // Dados do catálogo: mostra o que já foi visto e atualiza em segundo plano.
            urlPattern: ({ url }) =>
              url.hostname === "dummyjson.com" && !url.pathname.startsWith("/auth"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "api-catalogo",
              expiration: { maxEntries: 100, maxAgeSeconds: 86_400 },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "imagens",
              expiration: { maxEntries: 120, maxAgeSeconds: 604_800 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "fontes" },
          },
        ],
      },
    }),
  ],
  base: "/shop-catalog/",
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "dist", "e2e"],
    // Consultas por role no jsdom são lentas; com cobertura (instrumentação) dobram. 5 s era curto.
    testTimeout: 20_000,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "text", "lcov"],
      // Piso um pouco abaixo do medido (~96 / 93 / 93 / 97): barra regressões sem travar por oscilação.
      thresholds: { statements: 90, branches: 85, functions: 88, lines: 92 },
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/test/**",
        "src/setupTests.ts",
        "src/main.tsx", // ponto de entrada (montagem do React), coberto pelos e2e
        "src/i18n/locales/**", // só dados; paridade validada por teste próprio
      ],
    },
  },
});
