export type Language = "pt-BR" | "en";

export const LANGUAGES: readonly Language[] = ["pt-BR", "en"];
export const LANGUAGE_KEY = "shop-catalog:lang";

// Fusos horários brasileiros (IANA) — sinal de país quando o idioma do navegador é ambíguo.
const BRAZIL_TIME_ZONES = new Set([
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Belem",
  "America/Fortaleza",
  "America/Recife",
  "America/Bahia",
  "America/Cuiaba",
  "America/Campo_Grande",
  "America/Porto_Velho",
  "America/Rio_Branco",
  "America/Noronha",
  "America/Araguaina",
  "America/Maceio",
  "America/Boa_Vista",
  "America/Santarem",
  "America/Eirunepe",
]);

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

function readSaved(): Language | null {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    return isLanguage(saved) ? saved : null;
  } catch {
    return null;
  }
}

function readBrowserLanguages(): string[] {
  try {
    if (navigator.languages?.length) return [...navigator.languages];
    return navigator.language ? [navigator.language] : [];
  } catch {
    return [];
  }
}

function readTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

/**
 * Idioma inicial, em ordem de prioridade:
 * 1. escolha salva pelo usuário;
 * 2. idioma preferido do navegador (qualquer "pt" → pt-BR, qualquer outro → en);
 * 3. sem idioma do navegador: fuso horário brasileiro → pt-BR;
 * 4. en.
 */
export function resolveInitialLanguage(): Language {
  const saved = readSaved();
  if (saved) return saved;

  const [preferred] = readBrowserLanguages();
  if (preferred) return preferred.toLowerCase().startsWith("pt") ? "pt-BR" : "en";

  const timeZone = readTimeZone();
  return timeZone && BRAZIL_TIME_ZONES.has(timeZone) ? "pt-BR" : "en";
}
