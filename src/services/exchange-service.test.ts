import { http, getUsdBrlQuote } from "./exchange-service";

const awesome = { USDBRL: { bid: "5.2172", timestamp: "1790975912" } };
const frankfurter = { date: "2026-10-02", rates: { BRL: 5.2214 } };

describe("getUsdBrlQuote", () => {
  afterEach(() => vi.restoreAllMocks());

  it("usa a AwesomeAPI (bid como número e data do timestamp)", async () => {
    const get = vi.spyOn(http, "get").mockResolvedValue({ data: awesome });
    const quote = await getUsdBrlQuote();
    expect(quote.rate).toBe(5.2172);
    expect(quote.quotedAt).toBe(new Date(1790975912 * 1000).toISOString());
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("cai para a Frankfurter quando a primeira falha", async () => {
    vi.spyOn(http, "get")
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ data: frankfurter });
    expect((await getUsdBrlQuote()).rate).toBe(5.2214);
  });

  it.each([
    ["bid zero", { USDBRL: { bid: "0", timestamp: "1" } }],
    ["bid inválido", { USDBRL: { bid: "abc", timestamp: "1" } }],
    ["formato inesperado", { foo: 1 }],
  ])("trata %s como falha e usa a reserva", async (_label, payload) => {
    vi.spyOn(http, "get")
      .mockResolvedValueOnce({ data: payload })
      .mockResolvedValueOnce({ data: frankfurter });
    expect((await getUsdBrlQuote()).rate).toBe(5.2214);
  });

  it("propaga o erro quando as duas fontes falham", async () => {
    vi.spyOn(http, "get").mockRejectedValue(new Error("offline"));
    await expect(getUsdBrlQuote()).rejects.toThrow();
  });

  it("rejeita taxa inválida também na reserva", async () => {
    vi.spyOn(http, "get")
      .mockRejectedValueOnce(new Error("x"))
      .mockResolvedValueOnce({ data: { date: "2026-10-02", rates: { BRL: -1 } } });
    await expect(getUsdBrlQuote()).rejects.toThrow();
  });
});
