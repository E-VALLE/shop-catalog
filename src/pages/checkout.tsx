import {
  Alert,
  Button,
  Card,
  Container,
  Divider,
  Grid,
  Group,
  Stack,
  Stepper,
  Text,
  Title,
} from "@mantine/core";
import { IconCircleCheck, IconInfoCircle } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate } from "react-router";
import { PaymentDetails } from "../components/payment-details";
import { PaymentMethodPicker } from "../components/payment-method-picker";
import { SummaryLine } from "../components/summary-line";
import { formatPrice as formatMoney } from "../helpers/formatters";
import {
  MIN_INSTALLMENT_USD,
  PAYMENT_DISCOUNT_PERCENT,
  installmentLimit,
  orderNumber,
  payableTotal,
  paymentDiscount,
  splitInstallments,
  type PaymentMethod,
} from "../helpers/payment";
import { CHECKOUT_SUMMARY_BG } from "../theme/surfaces";
import { useAuth } from "../hooks/use-auth";
import { useCart } from "../hooks/use-cart";
import { useCurrency } from "../hooks/use-currency";
import { useDocumentTitle } from "../hooks/use-document-title";
import { useFormatPrice } from "../hooks/use-format-price";

const STEP_PAYMENT = 0;
const STEP_REVIEW = 1;
const STEP_DONE = 2;

interface ConfirmedOrder {
  number: string;
  method: PaymentMethod;
  installments: number;
  totalUsd: number;
}

/**
 * Checkout simulado em três etapas: pagamento → revisão → confirmação. Nada é cobrado, nenhum dado
 * de cartão é pedido e nada é guardado: o objetivo é mostrar o fluxo de uma loja real.
 */
export function Checkout() {
  const { t } = useTranslation();
  useDocumentTitle(t("checkout.title"));
  const { user } = useAuth();
  const { items, totalItems, summary, couponCode, clear, removeCoupon } = useCart();
  const { currency, rate } = useCurrency();
  const formatPrice = useFormatPrice();

  const [step, setStep] = useState(STEP_PAYMENT);
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [chosenInstallments, setChosenInstallments] = useState(1);
  // Semente dos códigos de demonstração e do número do pedido (estável durante a visita).
  const [orderId] = useState(() => Date.now() % 100_000);
  const [order, setOrder] = useState<ConfirmedOrder | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Ao trocar de etapa, o foco vai para o título (quem usa leitor de tela ouve onde está).
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  if (totalItems === 0 && !order) return <Navigate to="/carrinho" replace />;

  const displayRate = currency === "BRL" ? rate : 1;
  const totalUsd = order?.totalUsd ?? payableTotal(summary, method);
  // Parcelas são calculadas na moeda exibida (centavos de reais), para a soma fechar com o total.
  const displayTotal = Math.round(totalUsd * displayRate * 100) / 100;
  const maxInstallments = installmentLimit(
    Math.round(payableTotal(summary, "card") * displayRate * 100) / 100,
    MIN_INSTALLMENT_USD * displayRate,
  );
  const installments = Math.min(chosenInstallments, maxInstallments);
  const money = (displayAmount: number) => formatMoney(displayAmount, { currency, rate: 1 });

  const installmentLabel = (count: number, total: number) => {
    if (count === 1) return t("checkout.card.installmentOne", { value: money(total) });
    const split = splitInstallments(total, count);
    return split.exact
      ? t("checkout.card.installment", { n: count, value: money(split.rest) })
      : t("checkout.card.installmentFirst", {
          n: count,
          first: money(split.first),
          value: money(split.rest),
        });
  };
  const cardTotalDisplay = Math.round(payableTotal(summary, "card") * displayRate * 100) / 100;
  const installmentOptions = Array.from({ length: maxInstallments }, (_, index) => ({
    value: String(index + 1),
    label: installmentLabel(index + 1, cardTotalDisplay),
  }));

  const discountPercent = PAYMENT_DISCOUNT_PERCENT[method];
  const discount = paymentDiscount(summary, method);
  const methodName = t(`checkout.methods.${method}.name`);
  const holderName = user ? `${user.firstName} ${user.lastName}`.trim() : "";

  const confirm = () => {
    setOrder({
      number: orderNumber(orderId),
      method,
      installments,
      totalUsd: payableTotal(summary, method),
    });
    clear();
    removeCoupon(); // o cupom é de uso único por pedido
    setStep(STEP_DONE);
  };

  const paymentSummary = (m: PaymentMethod, count: number, total: number) =>
    m === "card"
      ? `${t("checkout.review.cardLine")} · ${installmentLabel(count, total)}`
      : t(`checkout.methods.${m}.name`);

  return (
    <Container size="lg" py="xl">
      <Stack>
        <Title order={1} ref={headingRef} tabIndex={-1} style={{ outline: "none" }}>
          {step === STEP_DONE ? t("checkout.done.title") : t("checkout.title")}
        </Title>

        <Stepper
          active={step === STEP_DONE ? STEP_DONE + 1 : step}
          aria-label={t("checkout.stepsLabel")}
          onStepClick={(index) => {
            if (step !== STEP_DONE && index < step) setStep(index);
          }}
          allowNextStepsSelect={false}
        >
          <Stepper.Step label={t("checkout.steps.payment")} />
          <Stepper.Step label={t("checkout.steps.review")} />
          <Stepper.Step label={t("checkout.steps.done")} />
        </Stepper>

        {step !== STEP_DONE && (
          <Alert variant="light" icon={<IconInfoCircle size={20} />}>
            <Text size="sm">{t("checkout.demoBanner")}</Text>
          </Alert>
        )}

        {step === STEP_DONE && order ? (
          <Card component="section" aria-live="polite">
            <Stack align="center" ta="center" py="md">
              <IconCircleCheck size={48} aria-hidden color="var(--mantine-color-teal-6)" />
              <Text size="lg" fw={700}>
                {t("checkout.done.order", { number: order.number })}
              </Text>
              <Text>
                {paymentSummary(
                  order.method,
                  order.installments,
                  Math.round(order.totalUsd * displayRate * 100) / 100,
                )}
              </Text>
              <Text fw={600}>
                {t("checkout.done.total", { total: formatPrice(order.totalUsd) })}
              </Text>
              <Text c="dimmed">{t("checkout.done.note")}</Text>
              <Group justify="center">
                <Button component={Link} to="/produtos">
                  {t("checkout.done.continueShopping")}
                </Button>
                <Button component={Link} to="/favoritos" variant="light">
                  {t("checkout.done.favorites")}
                </Button>
              </Group>
            </Stack>
          </Card>
        ) : (
          <Grid gap="lg">
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Stack gap="md">
                {step === STEP_PAYMENT ? (
                  <>
                    <PaymentMethodPicker
                      value={method}
                      onChange={setMethod}
                      maxInstallments={maxInstallments}
                    />
                    <PaymentDetails
                      method={method}
                      orderId={orderId}
                      holderName={holderName}
                      installments={installments}
                      installmentOptions={installmentOptions}
                      onInstallmentsChange={setChosenInstallments}
                    />
                    <Group justify="space-between">
                      <Button component={Link} to="/carrinho" variant="default">
                        {t("checkout.backToCart")}
                      </Button>
                      <Button onClick={() => setStep(STEP_REVIEW)}>{t("checkout.continue")}</Button>
                    </Group>
                  </>
                ) : (
                  <>
                    <Card component="section" aria-labelledby="review-items-title">
                      <Title order={2} id="review-items-title" size="h4">
                        {t("checkout.review.items", { count: totalItems })}
                      </Title>
                      <Stack gap="xs">
                        {items.map((item) => (
                          <Group key={item.id} justify="space-between" wrap="nowrap">
                            <Text size="sm" truncate>
                              {item.title} ×{item.quantity}
                            </Text>
                            <Text size="sm" fw={600}>
                              {formatPrice(item.price * item.quantity)}
                            </Text>
                          </Group>
                        ))}
                      </Stack>
                    </Card>
                    <Card component="section" aria-labelledby="review-payment-title">
                      <Group justify="space-between" align="flex-start">
                        <Stack gap={2}>
                          <Title order={2} id="review-payment-title" size="h4">
                            {t("checkout.review.payment")}
                          </Title>
                          <Text>{paymentSummary(method, installments, displayTotal)}</Text>
                        </Stack>
                        <Button variant="subtle" onClick={() => setStep(STEP_PAYMENT)}>
                          {t("checkout.change")}
                        </Button>
                      </Group>
                    </Card>
                    <Alert variant="light" icon={<IconInfoCircle size={20} />}>
                      <Text size="sm">{t("checkout.review.note")}</Text>
                    </Alert>
                    <Group justify="space-between">
                      <Button variant="default" onClick={() => setStep(STEP_PAYMENT)}>
                        {t("checkout.back")}
                      </Button>
                      <Button onClick={confirm}>{t("checkout.confirm")}</Button>
                    </Group>
                  </>
                )}
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card
                component="aside"
                aria-labelledby="checkout-summary-title"
                h="fit-content"
                bg={CHECKOUT_SUMMARY_BG}
              >
                <Title order={2} id="checkout-summary-title" size="h4">
                  {t("checkout.summary.title")}
                </Title>
                <Stack gap="xs">
                  <SummaryLine
                    label={t("cart.summary.subtotal")}
                    value={formatPrice(summary.listSubtotal)}
                  />
                  {summary.discountSavings > 0 && (
                    <SummaryLine
                      label={t("cart.summary.discounts")}
                      value={`− ${formatPrice(summary.discountSavings)}`}
                      tone="saving"
                    />
                  )}
                  {summary.couponSavings > 0 && (
                    <SummaryLine
                      label={t("cart.summary.coupon", { code: couponCode ?? "" })}
                      value={`− ${formatPrice(summary.couponSavings)}`}
                      tone="saving"
                    />
                  )}
                  {discount > 0 && (
                    <SummaryLine
                      label={t("checkout.summary.paymentDiscount", {
                        method: methodName,
                        percent: discountPercent,
                      })}
                      value={`− ${formatPrice(discount)}`}
                      tone="saving"
                    />
                  )}
                  <SummaryLine
                    label={t("cart.summary.shipping")}
                    value={
                      summary.shipping === 0
                        ? t("cart.summary.free")
                        : formatPrice(summary.shipping)
                    }
                  />
                  <Divider />
                  <Group justify="space-between">
                    <Text fw={600}>{t("checkout.summary.payNow")}</Text>
                    <Text size="xl" fw={700}>
                      {formatPrice(totalUsd)}
                    </Text>
                  </Group>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        )}
      </Stack>
    </Container>
  );
}
