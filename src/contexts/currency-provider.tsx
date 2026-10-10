import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import axios from "axios";
import { useLanguage } from "../hooks/use-language";
import { storedQuoteSchema } from "../schemas/session-schema";
import { getUsdBrlQuote, type UsdBrlQuote } from "../services/exchange-service";
import {
  CurrencyContext,
  type CurrencyContextValue,
  type CurrencyPreference,
} from "./currency-context-value";

export const FX_KEY = "shop-catalog:fx";
export const CURRENCY_PREF_KEY = "shop-catalog:currency";

function readPreference(): CurrencyPreference {
  try {
    const saved = localStorage.getItem(CURRENCY_PREF_KEY);
    return saved === "USD" || saved === "BRL" ? saved : "auto";
  } catch {
    return "auto";
  }
}
export const FX_TTL_MS = 12 * 60 * 60 * 1000;

type StoredQuote = UsdBrlQuote & { savedAt: number };

function readCache(): StoredQuote | null {
  try {
    const raw = localStorage.getItem(FX_KEY);
    if (!raw) return null;
    const parsed = storedQuoteSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeCache(quote: UsdBrlQuote) {
  try {
    const stored: StoredQuote = { ...quote, savedAt: Date.now() };
    localStorage.setItem(FX_KEY, JSON.stringify(stored));
  } catch {
    // sem armazenamento: a cotação vale apenas nesta sessão
  }
}

interface CurrencyProviderProps {
  children: ReactNode;
  /** Injetável para testes. */
  fetchQuote?: (signal: AbortSignal) => Promise<UsdBrlQuote>;
}

/**
 * Em pt-BR mostra preços em R$ com a cotação do dia; nos demais idiomas, USD.
 * Falha na cotação nunca bloqueia a interface: usa o cache (mesmo vencido) ou volta para USD.
 */
export function CurrencyProvider({ children, fetchQuote = getUsdBrlQuote }: CurrencyProviderProps) {
  const { language } = useLanguage();
  const [preference, setPreferenceState] = useState<CurrencyPreference>(readPreference);
  const wantsBrl = preference === "BRL" || (preference === "auto" && language === "pt-BR");

  const setPreference = useCallback((next: CurrencyPreference) => {
    setPreferenceState(next);
    try {
      if (next === "auto") localStorage.removeItem(CURRENCY_PREF_KEY);
      else localStorage.setItem(CURRENCY_PREF_KEY, next);
    } catch {
      // sem armazenamento: a escolha vale só nesta sessão
    }
  }, []);
  const [quote, setQuote] = useState<StoredQuote | null>(readCache);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!wantsBrl) return;
    if (quote && Date.now() - quote.savedAt <= FX_TTL_MS) return; // cotação ainda válida
    const controller = new AbortController();
    fetchQuote(controller.signal)
      .then((fresh) => {
        writeCache(fresh);
        setQuote({ ...fresh, savedAt: Date.now() });
        setFailed(false);
      })
      .catch((error: unknown) => {
        if (!axios.isCancel(error)) setFailed(true);
      });
    return () => controller.abort();
  }, [wantsBrl, quote, fetchQuote]);

  const value = useMemo<CurrencyContextValue>(() => {
    const base = { preference, setPreference };
    if (!wantsBrl) return { ...base, currency: "USD", rate: 1, quotedAt: null, status: "usd" };
    if (quote)
      return {
        ...base,
        currency: "BRL",
        rate: quote.rate,
        quotedAt: quote.quotedAt,
        status: "ready",
      };
    return {
      ...base,
      currency: "USD",
      rate: 1,
      quotedAt: null,
      status: failed ? "unavailable" : "loading",
    };
  }, [wantsBrl, quote, failed, preference, setPreference]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}
