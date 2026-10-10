import { createContext } from "react";
import type { Currency } from "../helpers/formatters";

/**
 * - `usd`: preços em dólar (idioma sem conversão ou preferência manual por USD);
 * - `loading`: reais pedidos (idioma pt-BR ou escolha manual), aguardando a cotação (exibe USD até chegar);
 * - `ready`: valores convertidos para BRL;
 * - `unavailable`: reais pedidos, mas sem cotação nem cache (exibe USD com aviso).
 */
export type CurrencyStatus = "usd" | "loading" | "ready" | "unavailable";

/** Escolha do usuário: `auto` segue o idioma (pt-BR → reais, demais → dólar). */
export type CurrencyPreference = "auto" | "USD" | "BRL";

export interface CurrencyContextValue {
  preference: CurrencyPreference;
  setPreference: (preference: CurrencyPreference) => void;
  currency: Currency;
  rate: number;
  /** Data da cotação (ISO) quando disponível. */
  quotedAt: string | null;
  status: CurrencyStatus;
}

export const CurrencyContext = createContext<CurrencyContextValue | null>(null);
