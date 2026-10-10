import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}/shop-catalog/`,
    locale: "pt-BR", // specs em português; e2e/i18n.spec.ts sobrescreve por teste
    // O service worker do PWA ignoraria page.route (mocks); só e2e/pwa.spec.ts o liga.
    serviceWorkers: "block",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  // E2E_CHANNEL=msedge|chrome usa um navegador já instalado (sem baixar o Chromium).
  projects: [
    {
      // Padrão (CI): API interceptada por e2e/fixtures/mock-api.ts — determinístico.
      name: "mocked",
      testIgnore: /(real|visual)\//,
      use: { ...devices["Desktop Chrome"], channel: process.env.E2E_CHANNEL || undefined },
    },
    {
      // `yarn e2e:visual`: comparação de capturas (claro/escuro). Linhas de base por sistema
      // operacional; fora do CI de propósito (fontes/antialiasing mudam entre Windows e Linux).
      name: "visual",
      testMatch: /visual\/.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        channel: process.env.E2E_CHANNEL || undefined,
      },
    },
    {
      // `yarn e2e:real`: smoke test contra a DummyJSON de verdade.
      name: "real",
      testMatch: /real\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], channel: process.env.E2E_CHANNEL || undefined },
    },
  ],
  webServer: {
    command: `yarn build && yarn preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/shop-catalog/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
