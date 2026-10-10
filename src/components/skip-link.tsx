import { Button } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const MAIN_CONTENT_ID = "main-content";

/**
 * Primeiro item da ordem de tabulação: fica fora da tela até receber foco e então leva
 * direto ao conteúdo, pulando o cabeçalho e a navegação (WCAG 2.4.1).
 */
export function SkipLink() {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);

  const skip = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault(); // evita alterar a URL (o app usa rotas por pathname)
    const main = document.getElementById(MAIN_CONTENT_ID);
    main?.focus();
    main?.scrollIntoView?.();
  };

  return (
    <Button
      component="a"
      href={`#${MAIN_CONTENT_ID}`}
      onClick={skip}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      pos="fixed"
      top={focused ? 8 : -100}
      left={8}
      style={{ zIndex: 1000 }}
    >
      {t("nav.skipToContent")}
    </Button>
  );
}
