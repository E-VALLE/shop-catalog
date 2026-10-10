import { ActionIcon, type ActionIconProps } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconScale } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { MAX_COMPARE } from "../contexts/compare-context-value";
import { useCompare } from "../hooks/use-compare";

interface CompareButtonProps extends Omit<ActionIconProps, "children" | "color" | "variant"> {
  product: { id: number; title: string };
  variant?: ActionIconProps["variant"];
  iconSize?: number;
}

/** Marca o produto para comparação (até 3). Botão de alternância com `aria-pressed`. */
export function CompareButton({
  product,
  iconSize = 18,
  variant = "white",
  ...props
}: CompareButtonProps) {
  const { t } = useTranslation();
  const { isComparing, toggle } = useCompare();
  const active = isComparing(product.id);

  return (
    <ActionIcon
      radius="xl"
      variant={active ? "filled" : variant}
      color={active ? "teal.9" : "gray"}
      aria-pressed={active}
      aria-label={t(active ? "compare.remove" : "compare.add", { title: product.title })}
      onClick={() => {
        if (toggle(product.id) === "full") {
          notifications.show({
            message: t("compare.full", { max: MAX_COMPARE }),
            color: "orange",
          });
        }
      }}
      {...props}
    >
      <IconScale size={iconSize} />
    </ActionIcon>
  );
}
