import i18n from "../i18n";
import { convertPrice, discountedPrice, formatCategory, formatPrice } from "./formatters";

describe("discountedPrice", () => {
  it("aplica o desconto e arredonda para centavos", () => {
    expect(discountedPrice(100, 15)).toBe(85);
    expect(discountedPrice(9.99, 12.5)).toBe(8.74);
  });

  it("ignora desconto ausente, negativo ou acima de 100%", () => {
    expect(discountedPrice(50)).toBe(50);
    expect(discountedPrice(50, -10)).toBe(50);
    expect(discountedPrice(50, 150)).toBe(0);
  });
});

describe("formatCategory", () => {
  it("traduz categoria conhecida e gera título para desconhecida", () => {
    expect(formatCategory("pet-supplies")).toBe("Pet Supplies");
    expect(formatCategory("beauty")).toBe("Beleza");
  });
});

describe("formatPrice", () => {
  const normalizeSpaces = (text: string) => text.replace(/\s/g, " ");

  it("formata em USD por padrão", () => {
    expect(normalizeSpaces(formatPrice(8.94))).toBe("US$ 8,94");
  });

  it("converte para BRL com a cotação", async () => {
    expect(normalizeSpaces(formatPrice(10, { currency: "BRL", rate: 5.2214 }))).toBe("R$ 52,21");
    expect(normalizeSpaces(formatPrice(0, { currency: "BRL", rate: 5 }))).toBe("R$ 0,00");
  });

  it("usa o formato do idioma ativo", async () => {
    await i18n.changeLanguage("en");
    expect(formatPrice(8.94)).toBe("$8.94");
  });
});

describe("convertPrice", () => {
  it("só converte quando a moeda é BRL", () => {
    expect(convertPrice(10, { currency: "USD", rate: 5 })).toBe(10);
    expect(convertPrice(10, { currency: "BRL", rate: 5 })).toBe(50);
  });
});
