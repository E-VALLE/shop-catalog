import { getJwtExpiry, isTokenExpired, msUntilExpiry } from "./jwt";

const b64url = (value: object | string) =>
  btoa(typeof value === "string" ? value : JSON.stringify(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const makeToken = (payload: object | string) =>
  `${b64url({ alg: "HS256" })}.${b64url(payload)}.assinatura`;

describe("getJwtExpiry", () => {
  it("lê o exp (segundos) do payload", () => {
    expect(getJwtExpiry(makeToken({ exp: 1_790_000_000 }))).toBe(1_790_000_000);
  });

  it("aceita base64url com caracteres especiais e acentos", () => {
    expect(getJwtExpiry(makeToken({ exp: 1_790_000_000, name: "José ~?>>>" }))).toBe(1_790_000_000);
  });

  it.each([
    ["sem exp", makeToken({ sub: "1" })],
    ["exp não numérico", makeToken({ exp: "amanhã" })],
    ["exp negativo", makeToken({ exp: -5 })],
    ["payload que não é JSON", makeToken("isto não é json")],
    ["token opaco (sem pontos)", "mock-access-token"],
    ["vazio", ""],
    ["só dois pontos", ".."],
    ["base64 inválido", "a.%%%.c"],
  ])("devolve null para %s", (_label, token) => {
    expect(getJwtExpiry(token)).toBeNull();
  });
});

describe("isTokenExpired / msUntilExpiry", () => {
  const exp = 2_000_000_000; // segundos
  const token = makeToken({ exp });

  it("não expirado antes do exp, expirado a partir dele", () => {
    expect(isTokenExpired(token, exp * 1000 - 1)).toBe(false);
    expect(isTokenExpired(token, exp * 1000)).toBe(true);
    expect(isTokenExpired(token, exp * 1000 + 60_000)).toBe(true);
  });

  it("considera a folga (skew) para expirar antes", () => {
    expect(isTokenExpired(token, exp * 1000 - 5_000, 10)).toBe(true);
    expect(isTokenExpired(token, exp * 1000 - 15_000, 10)).toBe(false);
  });

  it("token sem exp legível nunca é considerado expirado (quem decide é o servidor)", () => {
    expect(isTokenExpired("mock-access-token")).toBe(false);
    expect(msUntilExpiry("mock-access-token")).toBeNull();
  });

  it("tempo restante nunca é negativo", () => {
    expect(msUntilExpiry(token, exp * 1000 - 3_000)).toBe(3_000);
    expect(msUntilExpiry(token, exp * 1000 + 99_000)).toBe(0);
  });
});
