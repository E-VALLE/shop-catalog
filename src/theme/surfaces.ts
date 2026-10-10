/**
 * Superfícies e acentos de cor da interface, em um só lugar, para os temas claro e escuro.
 *
 * `light-dark(a, b)` (CSS) escolhe a cor pelo esquema ativo do Mantine, então o mesmo valor serve
 * nos dois temas e não precisamos de arquivos .css. Só aceita cores — por isso o gradiente do hero
 * usa `light-dark()` em cada parada de cor, e não no gradiente inteiro.
 *
 * Todas as combinações texto/fundo são auditadas pelo axe (e2e/a11y.spec.ts) em claro e escuro.
 */

const ld = (light: string, dark: string) => `light-dark(${light}, ${dark})`;
const mix = (color: string, percent: number, base: string) =>
  `color-mix(in srgb, var(--mantine-color-${color}) ${percent}%, ${base})`;

/** Cabeçalho fixo: tom azul muito suave (o texto azul dos botões precisa manter ≥ 4,5:1). */
export const HEADER_BG = ld(
  mix("blue-6", 7, "white"),
  mix("blue-9", 20, "var(--mantine-color-dark-7)"),
);
export const HEADER_BORDER = ld(
  "var(--mantine-color-blue-2)",
  mix("blue-9", 45, "var(--mantine-color-dark-4)"),
);

/** Painéis do dashboard: fundo azulado suave, distinto do fundo da página. */
export const PANEL_BG = ld(
  mix("blue-6", 5, "white"),
  mix("blue-9", 14, "var(--mantine-color-dark-6)"),
);

/** Resumo do pedido no checkout: verde-água suave, para se distinguir do painel azul do pagamento. */
export const CHECKOUT_SUMMARY_BG = ld(
  mix("teal-6", 7, "white"),
  mix("teal-9", 18, "var(--mantine-color-dark-6)"),
);

/** Moldura da imagem nos detalhes: no claro, leve variação de cinza (no escuro já é dark-6). */
export const IMAGE_PANEL_BG = ld(
  "var(--mantine-color-default-hover)",
  "var(--mantine-color-dark-6)",
);

/**
 * Hero da Home: o texto fica na parte clara/neutra (esquerda, contraste alto) e o degradê ganha cor
 * à direita, onde fica a ilustração.
 */
const heroLeft = ld(mix("blue-6", 6, "white"), mix("blue-9", 18, "var(--mantine-color-dark-7)"));
const heroRight = ld(
  "var(--mantine-color-blue-2)",
  mix("grape-9", 32, "var(--mantine-color-dark-7)"),
);
export const HERO_GRADIENT = `linear-gradient(105deg, ${heroLeft} 0%, ${heroLeft} 45%, ${heroRight} 100%)`;
/** Cor dos traços da ilustração do hero (suave, não compete com o texto). */
export const HERO_ART_COLOR = ld("var(--mantine-color-blue-4)", "var(--mantine-color-grape-5)");

/** Favoritos: rosa, para se distinguir do azul do carrinho (ícone, hover e contador). */
export const FAVORITE_ICON_COLOR = ld("var(--mantine-color-pink-8)", "var(--mantine-color-pink-3)");
