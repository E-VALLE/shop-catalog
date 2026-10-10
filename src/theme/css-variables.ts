import type { CSSVariablesResolver } from "@mantine/core";

/**
 * A11Y: o cinza padrão de `c="dimmed"` (gray.6, #868e96) tem 3,3:1 sobre branco, abaixo dos 4,5:1
 * exigidos para texto pelo WCAG AA. No claro escurecemos para gray.7 (≈7,9:1); no escuro o padrão
 * (dark.2, #828282) dá 3,5–4,0:1 sobre os cartões, então clareamos para dark.1 (≈7:1).
 */
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: { "--mantine-color-dimmed": "var(--mantine-color-gray-7)" },
  dark: { "--mantine-color-dimmed": "var(--mantine-color-dark-1)" },
});
