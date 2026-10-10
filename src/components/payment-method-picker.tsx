import { Group, Radio, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconCreditCard, IconQrcode, IconReceipt, type Icon } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { PAYMENT_DISCOUNT_PERCENT, PAYMENT_METHODS, type PaymentMethod } from "../helpers/payment";

const ICONS: Record<PaymentMethod, Icon> = {
  pix: IconQrcode,
  card: IconCreditCard,
  boleto: IconReceipt,
};

interface PaymentMethodPickerProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  /** Máximo de parcelas que o pedido comporta (aparece na dica do cartão). */
  maxInstallments: number;
}

/** Escolha da forma de pagamento: cartões selecionáveis (grupo de rádio, navegável por teclado). */
export function PaymentMethodPicker({
  value,
  onChange,
  maxInstallments,
}: PaymentMethodPickerProps) {
  const { t } = useTranslation();
  return (
    <Radio.Group
      value={value}
      onChange={(next) => onChange(next as PaymentMethod)}
      label={t("checkout.methodLegend")}
      withAsterisk={false}
    >
      <SimpleGrid cols={{ base: 1, sm: 3 }} mt="xs">
        {PAYMENT_METHODS.map((method) => {
          const MethodIcon = ICONS[method];
          const percent = PAYMENT_DISCOUNT_PERCENT[method];
          return (
            <Radio.Card key={method} value={method} p="md" radius="md">
              <Group wrap="nowrap" align="flex-start">
                <Radio.Indicator mt={2} />
                <Stack gap={4}>
                  <Group gap="xs" wrap="nowrap">
                    <MethodIcon size={20} aria-hidden />
                    <Text fw={600}>{t(`checkout.methods.${method}.name`)}</Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {t(`checkout.methods.${method}.hint`, { n: maxInstallments })}
                  </Text>
                  {percent > 0 && (
                    <Text
                      size="sm"
                      fw={600}
                      c="light-dark(var(--mantine-color-teal-9), var(--mantine-color-teal-3))"
                    >
                      {t("checkout.discountBadge", { percent })}
                    </Text>
                  )}
                </Stack>
              </Group>
            </Radio.Card>
          );
        })}
      </SimpleGrid>
    </Radio.Group>
  );
}
