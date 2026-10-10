import { ActionIcon, type ActionIconProps } from "@mantine/core";
import { IconHeart, IconHeartFilled } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useFavorites } from "../hooks/use-favorites";

interface FavoriteButtonProps extends Omit<ActionIconProps, "children" | "color" | "variant"> {
  product: { id: number; title: string };
  variant?: ActionIconProps["variant"];
  iconSize?: number;
}

/** Coração de favoritar: botão de alternância (`aria-pressed`) com rótulo que cita o produto. */
export function FavoriteButton({
  product,
  iconSize = 18,
  variant = "white",
  ...props
}: FavoriteButtonProps) {
  const { t } = useTranslation();
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(product.id);

  return (
    <ActionIcon
      radius="xl"
      variant={variant}
      color={active ? "red" : "gray"}
      aria-pressed={active}
      aria-label={t(active ? "favorites.remove" : "favorites.add", { title: product.title })}
      onClick={() => toggle(product.id)}
      {...props}
    >
      {active ? <IconHeartFilled size={iconSize} /> : <IconHeart size={iconSize} />}
    </ActionIcon>
  );
}
