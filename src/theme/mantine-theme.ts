/**
 * IMPORTANTE PARA A IA / DESENVOLVEDOR:
 * Este tema utiliza a fonte "Plus Jakarta Sans". Certifique-se de adicionar a fonte no `<head>` do `index.html` via Google Fonts:
 *
 * <link rel="preconnect" href="https://fonts.googleapis.com">
 * <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
 * <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
 */

import i18n from "../i18n";
import { IMAGE_PLACEHOLDER } from "./image-placeholder";
import {
  Button,
  Card,
  createTheme,
  Image,
  Modal,
  Notification,
  PasswordInput,
  rem,
  TextInput,
  Select,
  virtualColor,
} from "@mantine/core";

export const mantineTheme = createTheme({
  primaryColor: "blue",
  // A11Y: com o tom 6 (#228be6) o texto branco dos botões tem contraste 3,5:1 (< 4,5:1 do WCAG AA),
  // no claro e no escuro (o texto continua branco). O tom 8 chega a ≈5:1 nos dois.
  primaryShade: 8,
  // A11Y: com `autoContrast`, o ponto de virada entre texto branco/preto que maximiza o contraste
  // é ~0,179 (o padrão 0,3 deixava texto branco em laranja, 3,6:1).
  luminanceThreshold: 0.179,
  colors: {
    secondary: virtualColor({
      name: "secondary",
      dark: "orange",
      light: "orange",
    }),
  },
  fontFamily: "Plus Jakarta Sans, sans-serif",
  headings: {
    fontFamily: "Plus Jakarta Sans, sans-serif",
    sizes: {
      h1: { fontSize: rem("26px"), lineHeight: "1.3" }, // h1 with mantine original h2 size
      h2: { fontSize: rem("22px"), lineHeight: "1.35" }, // h2 with mantine original h3 size
      h3: { fontSize: rem("18px"), lineHeight: "1.4" }, // h3 with mantine original h4 size
    },
  },
  spacing: {
    xs: rem("10px"), // mantine default
    sm: rem("12px"), // mantine default
    md: rem("16px"), // mantine default
    lg: rem("20px"), // mantine default
    xl: rem("24px"), // smaller than mantine default (32px)
  },
  defaultRadius: "lg",
  components: {
    Button: Button.extend({
      defaultProps: {
        size: "md",
      },
    }),
    Card: Card.extend({
      defaultProps: {
        padding: "lg",
        withBorder: true,
        shadow: "sm",
      },
      styles: {
        root: {
          display: "flex",
          flexDirection: "column",
          gap: "var(--mantine-spacing-lg)",
        },
      },
    }),
    TextInput: TextInput.extend({
      defaultProps: {
        size: "md",
      },
      styles: {
        label: {
          marginBottom: "var(--mantine-spacing-xs)",
        },
      },
    }),
    PasswordInput: PasswordInput.extend({
      defaultProps: {
        size: "md",
      },
      styles: {
        label: {
          marginBottom: "var(--mantine-spacing-xs)",
        },
      },
    }),
    Select: Select.extend({
      defaultProps: {
        size: "md",
      },
      styles: {
        label: {
          marginBottom: "var(--mantine-spacing-xs)",
        },
      },
    }),
    Image: Image.extend({
      // Produto sem foto (ex.: criado no admin) ou imagem que falhou ao carregar.
      defaultProps: { fallbackSrc: IMAGE_PLACEHOLDER },
    }),
    Modal: Modal.extend({
      defaultProps: {
        // Getter: o rótulo acompanha a troca de idioma (o X do Modal não tinha nome acessível).
        closeButtonProps: {
          get "aria-label"() {
            return i18n.t("common.closeDialog");
          },
        },
      },
    }),
    Notification: Notification.extend({
      defaultProps: {
        // Getter: o rótulo é lido a cada render e acompanha a troca de idioma.
        closeButtonProps: {
          get "aria-label"() {
            return i18n.t("common.close");
          },
        },
      },
    }),
    Stack: {
      defaultProps: {
        gap: "lg",
      },
    },
    Group: {
      defaultProps: {
        gap: "lg",
      },
    },
  },
});
