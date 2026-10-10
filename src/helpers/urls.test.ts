import { catalogUrl } from "./urls";

describe("catalogUrl", () => {
  it("monta a URL com categoria e/ou marca", () => {
    expect(catalogUrl({ category: "furniture" })).toBe("/produtos?categoria=furniture");
    expect(catalogUrl({ brand: "Knoll" })).toBe("/produtos?marca=Knoll");
    expect(catalogUrl({ category: "furniture", brand: "Knoll" })).toBe(
      "/produtos?categoria=furniture&marca=Knoll",
    );
  });

  it("omite valores vazios e codifica caracteres especiais", () => {
    expect(catalogUrl({})).toBe("/produtos");
    expect(catalogUrl({ category: null, brand: "" })).toBe("/produtos");
    expect(catalogUrl({ brand: "Dolce & Gabbana" })).toBe("/produtos?marca=Dolce+%26+Gabbana");
  });
});
