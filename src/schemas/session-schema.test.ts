import {
  apiErrorSchema,
  parseCheckoutState,
  sessionUserSchema,
  storedQuoteSchema,
} from "./session-schema";

describe("parseCheckoutState (location.state externo)", () => {
  it("aceita estado válido", () => {
    expect(parseCheckoutState({ from: "/carrinho", checkout: true })).toEqual({
      from: "/carrinho",
      checkout: true,
    });
    expect(parseCheckoutState({ checkout: false })).toEqual({ checkout: false });
  });

  it.each([null, undefined, "texto", 42, [], { checkout: "sim" }, { from: 7 }])(
    "ignora lixo (%j)",
    (state) => {
      expect(parseCheckoutState(state)).toEqual({});
    },
  );

  it.each(["https://evil.example", "//evil.example", "javascript:alert(1)", "carrinho", ""])(
    "rejeita destino que não é um caminho interno (%j): sem redirecionamento aberto",
    (from) => {
      expect(parseCheckoutState({ from, checkout: true })).toEqual({});
    },
  );
});

describe("sessionUserSchema", () => {
  const valid = { id: 1, username: "emilys", firstName: "Emily", lastName: "Johnson" };

  it("aceita um usuário completo e remove campos extras", () => {
    expect(sessionUserSchema.parse({ ...valid, role: "admin", isAdmin: true })).toEqual({
      ...valid,
      role: "admin",
    });
  });

  it.each([undefined, null, "", "superuser", 5, "ADMIN"])(
    "papel ausente ou desconhecido (%j) vira user, o menos privilegiado",
    (role) => {
      expect(sessionUserSchema.parse({ ...valid, role }).role).toBe("user");
    },
  );

  it.each(["admin", "moderator", "user"])("preserva o papel %s", (role) => {
    expect(sessionUserSchema.parse({ ...valid, role }).role).toBe(role);
  });

  it.each([{ ...valid, id: "1" }, { ...valid, username: undefined }, null, "emilys"])(
    "rejeita %j",
    (value) => {
      expect(sessionUserSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe("storedQuoteSchema", () => {
  it("exige cotação positiva e finita", () => {
    const base = { quotedAt: "2026-10-02T12:00:00.000Z", savedAt: 1 };
    expect(storedQuoteSchema.safeParse({ ...base, rate: 5.2 }).success).toBe(true);
    for (const rate of [0, -1, Infinity, NaN, "5"]) {
      expect(storedQuoteSchema.safeParse({ ...base, rate }).success, String(rate)).toBe(false);
    }
  });
});

describe("apiErrorSchema", () => {
  it("só aceita mensagem de texto não vazia", () => {
    expect(apiErrorSchema.safeParse({ message: "Invalid credentials" }).success).toBe(true);
    for (const body of [{ message: "" }, { message: 5 }, {}, null, "erro"]) {
      expect(apiErrorSchema.safeParse(body).success).toBe(false);
    }
  });
});
