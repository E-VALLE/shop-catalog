import { Group, Text } from "@mantine/core";
import type { ReactNode } from "react";

/** Linha "rótulo ... valor" dos resumos de pedido; `saving` pinta descontos de verde. */
export function SummaryLine({
  label,
  value,
  tone,
}: {
  label: ReactNode;
  value: string;
  tone?: "saving";
}) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm">{label}</Text>
      <Text
        size="sm"
        fw={600}
        c={
          tone === "saving"
            ? "light-dark(var(--mantine-color-teal-9), var(--mantine-color-teal-3))"
            : undefined
        }
      >
        {value}
      </Text>
    </Group>
  );
}
