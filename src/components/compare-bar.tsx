import { Button, Group, Paper, Text } from "@mantine/core";
import { IconScale, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { MAX_COMPARE } from "../contexts/compare-context-value";
import { useCompare } from "../hooks/use-compare";

/** Barra fixa no rodapé enquanto há produtos marcados; leva à tela de comparação. */
export function CompareBar() {
  const { t } = useTranslation();
  const { count, clear } = useCompare();
  const { pathname } = useLocation();

  if (count === 0 || pathname === "/comparar") return null;

  return (
    <Paper
      component="aside"
      aria-label={t("compare.barLabel")}
      shadow="lg"
      withBorder
      p="xs"
      pos="fixed"
      bottom={16}
      left="50%"
      style={{ transform: "translateX(-50%)", zIndex: 150 }}
    >
      <Group gap="xs" wrap="nowrap">
        <IconScale size={20} aria-hidden />
        <Text size="sm" fw={600}>
          {t("compare.selected", { count, max: MAX_COMPARE })}
        </Text>
        <Button component={Link} to="/comparar" size="compact-md">
          {t("compare.open")}
        </Button>
        <Button
          variant="subtle"
          color="gray"
          size="compact-md"
          leftSection={<IconX size={14} />}
          onClick={clear}
        >
          {t("compare.clear")}
        </Button>
      </Group>
    </Paper>
  );
}
