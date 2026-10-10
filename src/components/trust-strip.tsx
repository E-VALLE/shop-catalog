import { Group, SimpleGrid, Text, ThemeIcon } from "@mantine/core";
import { IconLock, IconTruckDelivery, IconRotate2 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { FREE_SHIPPING_MIN_USD } from "../helpers/pricing";
import { useFormatPrice } from "../hooks/use-format-price";

/** Faixa de benefícios da loja (frete, devolução, pagamento) — conteúdo de confiança da Home. */
export function TrustStrip() {
  const { t } = useTranslation();
  const formatPrice = useFormatPrice();

  const items = [
    {
      key: "shipping",
      icon: IconTruckDelivery,
      title: t("home.trust.shipping.title"),
      text: t("home.trust.shipping.text", { amount: formatPrice(FREE_SHIPPING_MIN_USD) }),
    },
    {
      key: "returns",
      icon: IconRotate2,
      title: t("home.trust.returns.title"),
      text: t("home.trust.returns.text"),
    },
    {
      key: "secure",
      icon: IconLock,
      title: t("home.trust.secure.title"),
      text: t("home.trust.secure.text"),
    },
  ];

  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }} component="ul" m={0} p={0} style={{ listStyle: "none" }}>
      {items.map(({ key, icon: Icon, title, text }) => (
        <Group key={key} component="li" wrap="nowrap" align="flex-start">
          <ThemeIcon size={44} radius="md" variant="light" aria-hidden>
            <Icon size={24} />
          </ThemeIcon>
          <div>
            <Text fw={700}>{title}</Text>
            <Text size="sm" c="dimmed">
              {text}
            </Text>
          </div>
        </Group>
      ))}
    </SimpleGrid>
  );
}
