import axios from "axios";
import { z } from "zod";

// Instância própria: sem baseURL da DummyJSON, sem JWT e sem notificações globais de erro.
export const http = axios.create({ timeout: 8000 });

export interface UsdBrlQuote {
  /** Quantos reais valem 1 dólar. */
  rate: number;
  /** Momento da cotação (ISO 8601). */
  quotedAt: string;
}

const positiveNumber = z.coerce.number().positive().finite();

const awesomeApiSchema = z.object({
  USDBRL: z.object({
    bid: positiveNumber,
    timestamp: z.coerce.number().positive(),
  }),
});

const frankfurterSchema = z.object({
  date: z.string().min(1),
  rates: z.object({ BRL: positiveNumber }),
});

export const AWESOME_API_URL = "https://economia.awesomeapi.com.br/json/last/USD-BRL";
export const FRANKFURTER_URL = "https://api.frankfurter.dev/v1/latest?base=USD&symbols=BRL";

async function fromAwesomeApi(signal?: AbortSignal): Promise<UsdBrlQuote> {
  const { data } = await http.get<unknown>(AWESOME_API_URL, { signal });
  const { USDBRL } = awesomeApiSchema.parse(data);
  return { rate: USDBRL.bid, quotedAt: new Date(USDBRL.timestamp * 1000).toISOString() };
}

async function fromFrankfurter(signal?: AbortSignal): Promise<UsdBrlQuote> {
  const { data } = await http.get<unknown>(FRANKFURTER_URL, { signal });
  const parsed = frankfurterSchema.parse(data);
  return { rate: parsed.rates.BRL, quotedAt: new Date(`${parsed.date}T00:00:00Z`).toISOString() };
}

/** Cotação USD→BRL: AwesomeAPI (cotação do dia) com Frankfurter (BCE) como reserva. */
export async function getUsdBrlQuote(signal?: AbortSignal): Promise<UsdBrlQuote> {
  try {
    return await fromAwesomeApi(signal);
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    return fromFrankfurter(signal);
  }
}
