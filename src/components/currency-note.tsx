import { Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../hooks/use-currency";

/** Transparência da conversão: mostra a cotação usada ou o aviso de indisponibilidade. */
export function CurrencyNote() {
  const { t, i18n } = useTranslation();
  const { status, rate, quotedAt } = useCurrency();

  if (status === "unavailable") {
    return (
      <Text size="sm" c="dimmed" ta="center" role="status">
        {t("currency.unavailable")}
      </Text>
    );
  }
  if (status !== "ready" || !quotedAt) return null;

  const formattedRate = new Intl.NumberFormat(i18n.language, {
    style: "currency",
    currency: "BRL",
  }).format(rate);
  const date = new Intl.DateTimeFormat(i18n.language).format(new Date(quotedAt));

  return (
    <Text size="sm" c="dimmed" ta="center">
      {t("currency.note", { rate: formattedRate, date })}
    </Text>
  );
}
