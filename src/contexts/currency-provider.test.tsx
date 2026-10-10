import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import i18n from "../i18n";
import { useCurrency } from "../hooks/use-currency";
import { CURRENCY_PREF_KEY, CurrencyProvider, FX_KEY, FX_TTL_MS } from "./currency-provider";

const quote = { rate: 5, quotedAt: "2026-10-02T12:00:00.000Z" };

function setup(fetchQuote = vi.fn().mockResolvedValue(quote)) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CurrencyProvider fetchQuote={fetchQuote}>{children}</CurrencyProvider>
  );
  return { fetchQuote, ...renderHook(() => useCurrency(), { wrapper }) };
}

describe("CurrencyProvider", () => {
  it("lança erro fora do Provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useCurrency())).toThrow(/CurrencyProvider/);
    spy.mockRestore();
  });

  it("em inglês não consulta a cotação e usa USD", async () => {
    await i18n.changeLanguage("en");
    const { result, fetchQuote } = setup();
    expect(result.current).toMatchObject({ currency: "USD", rate: 1, status: "usd" });
    expect(fetchQuote).not.toHaveBeenCalled();
  });

  it("em pt-BR exibe USD enquanto carrega e depois converte para BRL, salvando em cache", async () => {
    const { result, fetchQuote } = setup();
    expect(result.current.status).toBe("loading");
    expect(result.current.currency).toBe("USD");

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toMatchObject({ currency: "BRL", rate: 5, quotedAt: quote.quotedAt });
    expect(fetchQuote).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(FX_KEY)!)).toMatchObject(quote);
  });

  it("usa o cache válido sem chamar a API", () => {
    localStorage.setItem(FX_KEY, JSON.stringify({ ...quote, rate: 4.9, savedAt: Date.now() }));
    const { result, fetchQuote } = setup();
    expect(result.current).toMatchObject({ currency: "BRL", rate: 4.9, status: "ready" });
    expect(fetchQuote).not.toHaveBeenCalled();
  });

  it("cache vencido: renova, e se a API falhar mantém a cotação antiga", async () => {
    const savedAt = Date.now() - FX_TTL_MS - 1000;
    localStorage.setItem(FX_KEY, JSON.stringify({ ...quote, rate: 4.8, savedAt }));
    const fetchQuote = vi.fn().mockRejectedValue(new Error("offline"));
    const { result } = setup(fetchQuote);
    await waitFor(() => expect(fetchQuote).toHaveBeenCalled());
    expect(result.current).toMatchObject({ currency: "BRL", rate: 4.8, status: "ready" });
  });

  it("sem cache e com falha da API, volta para USD com status unavailable", async () => {
    const { result } = setup(vi.fn().mockRejectedValue(new Error("offline")));
    await waitFor(() => expect(result.current.status).toBe("unavailable"));
    expect(result.current.currency).toBe("USD");
  });

  it("ignora cache corrompido", async () => {
    localStorage.setItem(FX_KEY, "{ruim");
    const { result, fetchQuote } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(fetchQuote).toHaveBeenCalledTimes(1);
  });

  it("ao trocar de en para pt-BR passa a buscar a cotação", async () => {
    await i18n.changeLanguage("en");
    const { result, fetchQuote } = setup();
    expect(fetchQuote).not.toHaveBeenCalled();
    await act(() => i18n.changeLanguage("pt-BR"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(fetchQuote).toHaveBeenCalledTimes(1);
  });
});

describe("CurrencyProvider: escolha manual da moeda", () => {
  it("padrão é 'auto': segue o idioma", async () => {
    const { result } = setup();
    expect(result.current.preference).toBe("auto");
    await waitFor(() => expect(result.current.status).toBe("ready"));
  });

  it("BRL manual funciona mesmo com o idioma em inglês (e busca a cotação)", async () => {
    await i18n.changeLanguage("en");
    const { result, fetchQuote } = setup();
    expect(fetchQuote).not.toHaveBeenCalled();
    act(() => result.current.setPreference("BRL"));
    await waitFor(() => expect(result.current.currency).toBe("BRL"));
    expect(fetchQuote).toHaveBeenCalledTimes(1);
  });

  it("USD manual em pt-BR mostra dólar e não consulta a cotação", () => {
    localStorage.setItem(CURRENCY_PREF_KEY, "USD");
    const { result, fetchQuote } = setup();
    expect(result.current).toMatchObject({ currency: "USD", status: "usd", preference: "USD" });
    expect(fetchQuote).not.toHaveBeenCalled();
  });

  it("persiste a escolha e 'auto' a remove", () => {
    const { result } = setup();
    act(() => result.current.setPreference("USD"));
    expect(localStorage.getItem(CURRENCY_PREF_KEY)).toBe("USD");
    act(() => result.current.setPreference("auto"));
    expect(localStorage.getItem(CURRENCY_PREF_KEY)).toBeNull();
  });

  it("ignora preferência salva inválida", () => {
    localStorage.setItem(CURRENCY_PREF_KEY, "EUR");
    const { result } = setup();
    expect(result.current.preference).toBe("auto");
  });
});
