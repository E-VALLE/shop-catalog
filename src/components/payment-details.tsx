import { Alert, Box, Button, Card, Group, Select, Stack, Text, Title } from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { IconCheck, IconCopy, IconInfoCircle, IconLock } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { PANEL_BG } from "../theme/surfaces";
import { demoBoletoLine, demoPixCode, demoQrModules, type PaymentMethod } from "../helpers/payment";

/** Ilustração de QR code: só desenho (aria-hidden), sem nenhum dado dentro. */
function QrIllustration({ seed }: { seed: number }) {
  const modules = demoQrModules(seed);
  const size = modules.length;
  const inFinder = (row: number, col: number) =>
    (row < 7 && col < 7) || (row < 7 && col >= size - 7) || (row >= size - 7 && col < 7);
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={7} height={7} fill="#000" />
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" />
      <rect x={x + 2} y={y + 2} width={3} height={3} fill="#000" />
    </g>
  );
  return (
    <Box
      component="svg"
      viewBox={`-2 -2 ${size + 4} ${size + 4}`}
      w={132}
      h={132}
      aria-hidden
      focusable="false"
      style={{ background: "#fff", borderRadius: 8, flexShrink: 0 }}
    >
      {modules.map((line, row) =>
        line.map(
          (filled, col) =>
            filled &&
            !inFinder(row, col) && (
              <rect key={`${row}-${col}`} x={col} y={row} width={1} height={1} fill="#000" />
            ),
        ),
      )}
      {finder(0, 0)}
      {finder(size - 7, 0)}
      {finder(0, size - 7)}
    </Box>
  );
}

function CopyableCode({
  label,
  code,
  copyLabel,
}: {
  label: string;
  code: string;
  copyLabel?: string;
}) {
  const { t } = useTranslation();
  const clipboard = useClipboard({ timeout: 2000 });
  return (
    <Stack gap={4}>
      <Text size="sm" fw={600}>
        {label}
      </Text>
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <Text
          size="sm"
          ff="monospace"
          style={{ wordBreak: "break-all", flex: 1 }}
          data-testid="demo-code"
        >
          {code}
        </Text>
        {copyLabel && (
          <Button
            variant="light"
            size="compact-sm"
            leftSection={clipboard.copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            onClick={() => clipboard.copy(code)}
          >
            {clipboard.copied ? t("checkout.pix.copied") : copyLabel}
          </Button>
        )}
      </Group>
    </Stack>
  );
}

function Note({ children }: { children: string }) {
  return (
    <Alert variant="light" color="gray" icon={<IconInfoCircle size={18} />} p="xs">
      <Text size="sm">{children}</Text>
    </Alert>
  );
}

interface PaymentDetailsProps {
  method: PaymentMethod;
  /** Semente dos códigos de demonstração (número do pedido em preparação). */
  orderId: number;
  /** Nome do usuário logado, impresso no cartão de teste. */
  holderName: string;
  installments: number;
  installmentOptions: { value: string; label: string }[];
  onInstallmentsChange: (installments: number) => void;
}

/**
 * Detalhes da forma escolhida. O cartão NÃO tem campos de número, validade ou CVV, de propósito:
 * mostramos só um "cartão de teste" e as parcelas, e explicamos o motivo em texto curto.
 */
export function PaymentDetails({
  method,
  orderId,
  holderName,
  installments,
  installmentOptions,
  onInstallmentsChange,
}: PaymentDetailsProps) {
  const { t } = useTranslation();

  if (method === "pix") {
    return (
      <Card component="section" aria-labelledby="payment-detail-title" bg={PANEL_BG}>
        <Title order={2} id="payment-detail-title" size="h4">
          {t("checkout.pix.title")}
        </Title>
        <Group align="flex-start" wrap="wrap" gap="lg">
          <QrIllustration seed={orderId} />
          <Stack flex="1 1 240px" miw={0}>
            <CopyableCode
              label={t("checkout.pix.codeLabel")}
              code={demoPixCode(orderId)}
              copyLabel={t("checkout.pix.copy")}
            />
            <Note>{t("checkout.pix.note")}</Note>
          </Stack>
        </Group>
      </Card>
    );
  }

  if (method === "boleto") {
    return (
      <Card component="section" aria-labelledby="payment-detail-title" bg={PANEL_BG}>
        <Title order={2} id="payment-detail-title" size="h4">
          {t("checkout.boleto.title")}
        </Title>
        <Stack>
          <CopyableCode label={t("checkout.boleto.codeLabel")} code={demoBoletoLine(orderId)} />
          <Text size="sm">{t("checkout.boleto.due")}</Text>
          <Note>{t("checkout.boleto.note")}</Note>
        </Stack>
      </Card>
    );
  }

  return (
    <Card component="section" aria-labelledby="payment-detail-title" bg={PANEL_BG}>
      <Title order={2} id="payment-detail-title" size="h4">
        {t("checkout.card.title")}
      </Title>
      <Group align="flex-start" wrap="wrap" gap="lg">
        {/* Cartão de teste: só ilustração com o nome de quem está logado; nenhum dado real. */}
        <Card
          bg="blue.9"
          c="white"
          w={260}
          maw="100%"
          radius="lg"
          aria-hidden
          style={{ flexShrink: 0 }}
        >
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="xs" fw={600} tt="uppercase">
                {t("checkout.card.previewLabel")}
              </Text>
              <Text size="sm" fw={700} fs="italic">
                VISA
              </Text>
            </Group>
            <Text ff="monospace" size="lg" mt="sm">
              •••• •••• •••• 4242
            </Text>
            <Group justify="space-between">
              <Text size="sm" tt="uppercase" truncate>
                {holderName}
              </Text>
              <Text size="sm">12/30</Text>
            </Group>
          </Stack>
        </Card>
        <Stack flex="1 1 240px" miw={0}>
          <Group gap={6} wrap="nowrap">
            <IconLock size={16} aria-hidden />
            <Text size="sm" fw={600}>
              {t("checkout.card.noData")}
            </Text>
          </Group>
          <Select
            label={t("checkout.card.installments")}
            data={installmentOptions}
            value={String(installments)}
            onChange={(value) => value && onInstallmentsChange(Number(value))}
            allowDeselect={false}
            comboboxProps={{ withinPortal: true }}
          />
          <Note>{t("checkout.card.note")}</Note>
        </Stack>
      </Group>
    </Card>
  );
}
