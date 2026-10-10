import { useTranslation } from "react-i18next";
import { LANGUAGE_KEY, isLanguage, type Language } from "../i18n/detect-language";

export function useLanguage(): {
  language: Language;
  setLanguage: (language: Language) => void;
} {
  const { i18n } = useTranslation();
  const language: Language = isLanguage(i18n.language) ? i18n.language : "en";

  const setLanguage = (next: Language) => {
    try {
      localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      // sem armazenamento: a escolha vale apenas até recarregar
    }
    void i18n.changeLanguage(next);
  };

  return { language, setLanguage };
}
