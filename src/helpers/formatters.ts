import i18n from "../i18n";

export type Currency = "USD" | "BRL";

export interface PriceContext {
  currency: Currency;
  /** Reais por dólar; só usado quando `currency` é BRL. */
  rate: number;
}

const formatters = new Map<string, Intl.NumberFormat>();

function numberFormat(locale: string, currency: Currency): Intl.NumberFormat {
  const key = `${locale}:${currency}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: "currency", currency });
    formatters.set(key, formatter);
  }
  return formatter;
}

/** Converte um valor em USD (moeda da API) para a moeda de exibição. */
export function convertPrice(valueUsd: number, { currency, rate }: PriceContext): number {
  return currency === "BRL" ? valueUsd * rate : valueUsd;
}

/** Formata um valor em USD na moeda e no idioma ativos (conversão só de exibição). */
export function formatPrice(
  valueUsd: number,
  context: PriceContext = { currency: "USD", rate: 1 },
): string {
  return numberFormat(i18n.language, context.currency).format(convertPrice(valueUsd, context));
}

/** Preço com desconto aplicado, arredondado para centavos. */
export function discountedPrice(price: number, discountPercentage = 0): number {
  const pct = Math.min(Math.max(discountPercentage, 0), 100);
  return Math.round(price * (1 - pct / 100) * 100) / 100;
}

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Nome da categoria no idioma ativo; slugs desconhecidos caem num título gerado. */
export function formatCategory(slug: string): string {
  return i18n.t(`categories.${slug}`, { defaultValue: slugToTitle(slug) });
}

/** Opções de Select ordenadas pelo rótulo traduzido. */
export function categoryOptions(
  categories: { slug: string }[],
): { value: string; label: string }[] {
  return categories
    .map(({ slug }) => ({ value: slug, label: formatCategory(slug) }))
    .sort((a, b) => a.label.localeCompare(b.label, i18n.language));
}
