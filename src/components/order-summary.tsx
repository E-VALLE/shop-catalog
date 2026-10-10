import {
  Button,
  Card,
  CloseButton,
  Group,
  Progress,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconTicket } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SummaryLine } from "./summary-line";
import { FREE_SHIPPING_MIN_USD, findCouponPercent } from "../helpers/pricing";
import { useCart } from "../hooks/use-cart";
import { useFormatPrice } from "../hooks/use-format-price";

interface OrderSummaryProps {
  onCheckout: () => void;
  onClear: () => void;
}

/** Resumo do pedido: subtotal, descontos, cupom, frete (grátis acima do mínimo) e total. */
export function OrderSummary({ onCheckout, onClear }: OrderSummaryProps) {
  const { t } = useTranslation();
  const formatPrice = useFormatPrice();
  const { summary, totalItems, couponCode, applyCoupon, removeCoupon } = useCart();
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);

  const couponPercent = couponCode ? findCouponPercent(couponCode) : null;
  const progress = Math.min(
    100,
    (1 - summary.remainingForFreeShipping / FREE_SHIPPING_MIN_USD) * 100,
  );

  const submitCoupon = (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return;
    const result = applyCoupon(code);
    setInvalid(result === "invalid");
    if (result === "applied") setCode("");
  };

  return (
    <Card component="section" aria-labelledby="order-summary-title">
      <Title order={2} id="order-summary-title">
        {t("cart.summary.title")}
      </Title>

      <Stack gap="xs">
        <SummaryLine label={t("cart.summary.subtotal")} value={formatPrice(summary.listSubtotal)} />
        {summary.discountSavings > 0 && (
          <SummaryLine
            label={t("cart.summary.discounts")}
            value={`− ${formatPrice(summary.discountSavings)}`}
            tone="saving"
          />
        )}
        {couponCode && (
          <SummaryLine
            label={
              <Group gap={4} component="span" wrap="nowrap">
                {t("cart.summary.coupon", { code: couponCode })}
                <CloseButton
                  size="xs"
                  aria-label={t("cart.summary.removeCoupon", { code: couponCode })}
                  onClick={removeCoupon}
                />
              </Group>
            }
            value={`− ${formatPrice(summary.couponSavings)}`}
            tone="saving"
          />
        )}
        <SummaryLine
          label={t("cart.summary.shipping")}
          value={summary.shipping === 0 ? t("cart.summary.free") : formatPrice(summary.shipping)}
        />
      </Stack>

      {/* Incentivo ao frete grátis */}
      <Stack gap={4}>
        <Progress value={progress} aria-hidden />
        <Text size="sm" c="dimmed" role="status">
          {summary.remainingForFreeShipping > 0
            ? t("cart.summary.freeShippingHint", {
                amount: formatPrice(summary.remainingForFreeShipping),
              })
            : t("cart.summary.freeShippingDone")}
        </Text>
      </Stack>

      <form onSubmit={submitCoupon} noValidate>
        <Group align="flex-end" wrap="nowrap" gap="xs">
          <TextInput
            flex={1}
            aria-label={t("cart.summary.couponLabel")}
            placeholder={t("cart.summary.couponPlaceholder")}
            leftSection={<IconTicket size={18} />}
            value={code}
            onChange={(event) => {
              setCode(event.currentTarget.value);
              setInvalid(false);
            }}
            error={invalid ? t("cart.summary.couponInvalid") : undefined}
            description={
              couponPercent
                ? t("cart.summary.couponApplied", { percent: couponPercent })
                : t("cart.summary.couponDemo")
            }
          />
          <Button type="submit" variant="light" mt={0}>
            {t("cart.summary.couponApply")}
          </Button>
        </Group>
      </form>

      <Group justify="space-between">
        <Text size="lg">{t("cart.total", { count: totalItems })}</Text>
        <Text size="xl" fw={700}>
          {formatPrice(summary.total)}
        </Text>
      </Group>
      <Group justify="flex-end">
        <Button variant="subtle" color="red" onClick={onClear}>
          {t("cart.clear")}
        </Button>
        <Button onClick={onCheckout}>{t("cart.checkout")}</Button>
      </Group>
    </Card>
  );
}
