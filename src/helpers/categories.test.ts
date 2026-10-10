import i18n from "../i18n";
import { categoryOptions, formatCategory } from "./formatters";

const API_SLUGS = [
  "beauty",
  "fragrances",
  "furniture",
  "groceries",
  "home-decoration",
  "kitchen-accessories",
  "laptops",
  "mens-shirts",
  "mens-shoes",
  "mens-watches",
  "mobile-accessories",
  "motorcycle",
  "skin-care",
  "smartphones",
  "sports-accessories",
  "sunglasses",
  "tablets",
  "tops",
  "vehicle",
  "womens-bags",
  "womens-dresses",
  "womens-jewellery",
  "womens-shoes",
  "womens-watches",
];

describe("formatCategory", () => {
  it("traduz para português e inglês", async () => {
    await i18n.changeLanguage("pt-BR");
    expect(formatCategory("mens-shirts")).toBe("Camisas masculinas");
    expect(formatCategory("beauty")).toBe("Beleza");
    await i18n.changeLanguage("en");
    expect(formatCategory("mens-shirts")).toBe("Men's shirts");
  });

  it("tem tradução para todas as categorias conhecidas, nos dois idiomas", async () => {
    for (const lng of ["pt-BR", "en"]) {
      await i18n.changeLanguage(lng);
      for (const slug of API_SLUGS) {
        expect(i18n.exists(`categories.${slug}`), `${lng}:${slug}`).toBe(true);
      }
    }
  });

  it("gera um título legível para slug desconhecido", () => {
    expect(formatCategory("pet-supplies")).toBe("Pet Supplies");
  });
});

describe("categoryOptions", () => {
  it("ordena pelo rótulo traduzido, mantendo o slug como valor", async () => {
    await i18n.changeLanguage("pt-BR");
    const options = categoryOptions([
      { slug: "womens-bags" },
      { slug: "beauty" },
      { slug: "tablets" },
    ]);
    expect(options).toEqual([
      { value: "beauty", label: "Beleza" },
      { value: "womens-bags", label: "Bolsas femininas" },
      { value: "tablets", label: "Tablets" },
    ]);
  });
});
