import { LANGUAGE_KEY, resolveInitialLanguage } from "./detect-language";

function mockBrowser(languages: string[] | undefined, timeZone?: string) {
  vi.spyOn(navigator, "languages", "get").mockReturnValue(languages as readonly string[]);
  vi.spyOn(navigator, "language", "get").mockReturnValue(languages?.[0] ?? "");
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    timeZone,
  } as Intl.ResolvedDateTimeFormatOptions);
}

describe("resolveInitialLanguage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("prioriza a escolha salva sobre o navegador", () => {
    localStorage.setItem(LANGUAGE_KEY, "en");
    mockBrowser(["pt-BR"], "America/Sao_Paulo");
    expect(resolveInitialLanguage()).toBe("en");
  });

  it("ignora valor salvo inválido", () => {
    localStorage.setItem(LANGUAGE_KEY, "fr");
    mockBrowser(["en-US"]);
    expect(resolveInitialLanguage()).toBe("en");
  });

  it.each([
    [["pt-BR"], "pt-BR"],
    [["pt-PT"], "pt-BR"],
    [["pt"], "pt-BR"],
    [["en-US"], "en"],
    [["es-ES", "pt-BR"], "en"], // usa o idioma preferido (primeiro), não o primeiro "pt"
    [["fr"], "en"],
  ])("idioma do navegador %j → %s", (languages, expected) => {
    mockBrowser(languages);
    expect(resolveInitialLanguage()).toBe(expected);
  });

  it("respeita o navegador em inglês mesmo com fuso brasileiro", () => {
    mockBrowser(["en-US"], "America/Sao_Paulo");
    expect(resolveInitialLanguage()).toBe("en");
  });

  it("usa o fuso horário quando o navegador não informa idioma", () => {
    mockBrowser([], "America/Manaus");
    expect(resolveInitialLanguage()).toBe("pt-BR");
    mockBrowser([], "Europe/Berlin");
    expect(resolveInitialLanguage()).toBe("en");
  });

  it("cai para inglês quando nada está disponível", () => {
    mockBrowser(undefined, undefined);
    expect(resolveInitialLanguage()).toBe("en");
  });

  it("não quebra se localStorage lançar erro", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    mockBrowser(["pt-BR"]);
    expect(resolveInitialLanguage()).toBe("pt-BR");
  });
});
