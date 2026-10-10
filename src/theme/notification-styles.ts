import type { NotificationProps } from "@mantine/core";

/**
 * Notificação de "removido do carrinho": fundo âmbar (diferente do branco/escuro da página e do
 * azul da marca) para chamar atenção, já que é uma ação com prazo para desfazer.
 * `light-dark()` escolhe a cor pelo esquema ativo (claro/escuro) sem precisar de CSS à parte.
 * Contrastes verificados pelo axe nos dois temas (e2e/a11y.spec.ts).
 */
export const REMOVAL_BACKGROUND =
  "light-dark(var(--mantine-color-orange-0), color-mix(in srgb, var(--mantine-color-orange-9) 28%, var(--mantine-color-dark-8)))";

/** Cor da frase em destaque ("removido do carrinho"): vermelho escuro (red.9, ≈5,3:1 sobre o fundo âmbar) no claro, laranja claro no escuro. */
export const REMOVAL_HIGHLIGHT_COLOR =
  "light-dark(var(--mantine-color-red-9), var(--mantine-color-orange-3))";

export const REMOVAL_NOTIFICATION_STYLES: NotificationProps["styles"] = {
  root: {
    backgroundColor: REMOVAL_BACKGROUND,
    borderColor: "light-dark(var(--mantine-color-orange-4), var(--mantine-color-orange-7))",
  },
  description: {
    color: "light-dark(var(--mantine-color-dark-9), var(--mantine-color-dark-0))",
  },
};
