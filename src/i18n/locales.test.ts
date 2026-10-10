import en from "./locales/en";
import ptBR from "./locales/pt-BR";

function flatten(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? flatten(value as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe("dicionários", () => {
  it("en e pt-BR têm exatamente as mesmas chaves", () => {
    expect(flatten(en).sort()).toEqual(flatten(ptBR).sort());
  });

  it("mantêm os mesmos placeholders de interpolação", () => {
    const placeholders = (text: string) => (text.match(/{{\w+}}/g) ?? []).sort();
    const enFlat = Object.fromEntries(flatten(en).map((k) => [k, k]));
    for (const key of Object.keys(enFlat)) {
      const get = (dict: Record<string, unknown>) =>
        key
          .split(".")
          .reduce<unknown>((acc, part) => (acc as Record<string, unknown>)[part], dict) as string;
      expect(placeholders(get(en)), key).toEqual(placeholders(get(ptBR)));
    }
  });

  it("toda mensagem de validação do Zod existe no dicionário", () => {
    for (const dict of [en, ptBR]) {
      expect(Object.keys(dict.validation)).toEqual(
        expect.arrayContaining(["usernameRequired", "passwordMin", "titleMin", "stockMin"]),
      );
    }
  });
});
