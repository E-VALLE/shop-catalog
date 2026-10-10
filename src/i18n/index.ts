import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resolveInitialLanguage } from "./detect-language";
import en from "./locales/en";
import ptBR from "./locales/pt-BR";

export const resources = {
  "pt-BR": { translation: ptBR },
  en: { translation: en },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: resolveInitialLanguage(),
  fallbackLng: "en",
  initAsync: false,
  interpolation: { escapeValue: false }, // o React já escapa
});

const syncHtmlLang = (language: string) => {
  document.documentElement.lang = language;
};
syncHtmlLang(i18n.language);
i18n.on("languageChanged", syncHtmlLang);

export default i18n;
