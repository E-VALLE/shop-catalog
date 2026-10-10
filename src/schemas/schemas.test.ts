import { loginResponseSchema, loginSchema } from "./login-schema";
import { productFormSchema, productsResponseSchema } from "./product-schema";

describe("loginSchema", () => {
  it("rejeita campos vazios e senha curta", () => {
    const result = loginSchema.safeParse({ username: "  ", password: "123" });
    expect(result.success).toBe(false);
    const fields = result.error?.issues.map((i) => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["username", "password"]));
  });

  it("aceita credenciais válidas", () => {
    expect(loginSchema.safeParse({ username: "emilys", password: "emilyspass" }).success).toBe(
      true,
    );
  });
});

describe("loginResponseSchema", () => {
  it("falha sem accessToken", () => {
    expect(
      loginResponseSchema.safeParse({ id: 1, username: "a", firstName: "A", lastName: "B" })
        .success,
    ).toBe(false);
  });
});

describe("productFormSchema", () => {
  const valid = {
    title: "Notebook",
    description: "Notebook de alta performance",
    category: "laptops",
    price: 10,
    stock: 0,
  };

  it("aceita produto válido (estoque zero é permitido)", () => {
    expect(productFormSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ["título vazio", { title: "" }],
    ["preço zero", { price: 0 }],
    ["preço negativo", { price: -5 }],
    ["estoque negativo", { stock: -1 }],
    ["estoque fracionado", { stock: 1.5 }],
    ["sem categoria", { category: "" }],
  ])("rejeita %s", (_label, override) => {
    expect(productFormSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });
});

describe("productsResponseSchema", () => {
  it("rejeita resposta fora do contrato", () => {
    expect(productsResponseSchema.safeParse({ products: [{ id: "x" }] }).success).toBe(false);
  });
});
