import { Badge, Menu, UnstyledButton } from "@mantine/core";
import { IconCheck, IconCoin } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import type { CurrencyPreference } from "../contexts/currency-context-value";
import { useCurrency } from "../hooks/use-currency";

const OPTIONS: CurrencyPreference[] = ["auto", "BRL", "USD"];
const LABEL_KEY = { auto: "currency.auto", BRL: "currency.brl", USD: "currency.usd" } as const;

/** Escolha manual da moeda de exibição (o padrão segue o idioma). */
export function CurrencySwitcher() {
  const { t } = useTranslation();
  const { currency, preference, setPreference } = useCurrency();

  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <UnstyledButton aria-label={`${t("currency.label")}: ${t(LABEL_KEY[preference])}`}>
          <Badge
            variant="light"
            size="lg"
            leftSection={<IconCoin size={14} />}
            style={{ cursor: "pointer" }}
          >
            {t(`currency.short.${currency}`)}
          </Badge>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{t("currency.label")}</Menu.Label>
        {OPTIONS.map((option) => (
          <Menu.Item
            key={option}
            aria-current={option === preference ? "true" : undefined}
            rightSection={option === preference ? <IconCheck size={16} /> : null}
            onClick={() => setPreference(option)}
          >
            {t(LABEL_KEY[option])}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
