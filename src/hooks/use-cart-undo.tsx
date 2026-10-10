import { Button, Group, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useCallback, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { RemovedCartItem } from "../contexts/cart-context-value";
import { REMOVAL_HIGHLIGHT_COLOR, REMOVAL_NOTIFICATION_STYLES } from "../theme/notification-styles";
import { useCart } from "./use-cart";

const UNDO_TIMEOUT_MS = 8000;

/** Remoção de itens do carrinho com notificação "Desfazer". */
export function useCartUndo(): {
  removeWithUndo: (id: number) => void;
  clearWithUndo: () => void;
} {
  const { t } = useTranslation();
  const { items, removeItem, clear, restoreItems } = useCart();

  /** "<assunto> removido do carrinho." com a frase de ação em destaque (negrito + cor). */
  const removalMessage = useCallback(
    (subject: ReactNode, count: number) => (
      <>
        {subject}{" "}
        <Text span inherit fw={700} c={REMOVAL_HIGHLIGHT_COLOR}>
          {t("cart.removedPhrase", { count })}
        </Text>
        .
      </>
    ),
    [t],
  );

  const offerUndo = useCallback(
    (message: ReactNode, removed: RemovedCartItem[]) => {
      const id = `cart-undo-${Date.now()}`;
      notifications.show({
        id,
        autoClose: UNDO_TIMEOUT_MS,
        color: "orange",
        styles: REMOVAL_NOTIFICATION_STYLES,
        message: (
          <Group justify="space-between" wrap="nowrap" gap="xs">
            {/* O texto cede espaço (e quebra linha); o botão nunca encolhe, senão o rótulo é cortado. */}
            <Text size="sm" flex={1} miw={0}>
              {message}
            </Text>
            <Button
              size="compact-md"
              variant="default"
              flex="none"
              px="sm"
              onClick={() => {
                restoreItems(removed);
                notifications.hide(id);
              }}
            >
              {t("cart.undo")}
            </Button>
          </Group>
        ),
      });
    },
    [restoreItems, t],
  );

  const removeWithUndo = useCallback(
    (id: number) => {
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return;
      const item = items[index];
      removeItem(id);
      offerUndo(removalMessage(item.title, 1), [{ item, index }]);
    },
    [items, removeItem, offerUndo, removalMessage],
  );

  const clearWithUndo = useCallback(() => {
    if (items.length === 0) return;
    const removed = items.map((item, index) => ({ item, index }));
    clear();
    offerUndo(
      removalMessage(t("cart.itemsCount", { count: removed.length }), removed.length),
      removed,
    );
  }, [items, clear, offerUndo, removalMessage, t]);

  return { removeWithUndo, clearWithUndo };
}
