import { Group, Table, UnstyledButton } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconSelector } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import type { SortKey } from "../helpers/sorting";

interface SortableThProps {
  label: string;
  asc: SortKey;
  desc: SortKey;
  current: SortKey | null;
  onSort: (key: SortKey | null) => void;
  align?: "left" | "right";
}

/**
 * Cabeçalho de coluna ordenável: clique alterna crescente → decrescente → sem ordenação.
 * O estado vai em `aria-sort` (leitores de tela) e no ícone (visual).
 */
export function SortableTh({ label, asc, desc, current, onSort, align = "left" }: SortableThProps) {
  const { t } = useTranslation();
  const direction = current === asc ? "ascending" : current === desc ? "descending" : "none";
  const next = direction === "none" ? asc : direction === "ascending" ? desc : null;
  const Icon =
    direction === "ascending"
      ? IconArrowUp
      : direction === "descending"
        ? IconArrowDown
        : IconSelector;

  return (
    <Table.Th aria-sort={direction} ta={align}>
      <UnstyledButton
        onClick={() => onSort(next)}
        aria-label={t("admin.sortBy", { column: label })}
        fw={700}
        fz="sm"
      >
        <Group gap={4} justify={align === "right" ? "flex-end" : "flex-start"} wrap="nowrap">
          {label}
          <Icon size={14} aria-hidden />
        </Group>
      </UnstyledButton>
    </Table.Th>
  );
}
