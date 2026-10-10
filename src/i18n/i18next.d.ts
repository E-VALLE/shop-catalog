import "i18next";
import type { Translation } from "./locales/pt-BR";

// Tipagem forte das chaves: `t("cart.titulo")` (chave inexistente) passa a ser erro de compilação.
// O dicionário em português é a fonte dos tipos; `locales.test.ts` garante que o inglês tem as mesmas chaves.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: Translation };
  }
}
