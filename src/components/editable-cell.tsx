import { ActionIcon, Group, NumberInput, Text } from "@mantine/core";
import { IconCheck, IconPencil, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { productFormSchema } from "../schemas/product-schema";

type Field = "price" | "stock";

interface EditableCellProps {
  field: Field;
  title: string;
  /** Valor atual, no formato da API (preço em USD; estoque inteiro). */
  value: number | undefined;
  /** Texto exibido fora da edição (ex.: preço já na moeda ativa). */
  display: string;
  onSave: (value: number) => Promise<void>;
}

const schemas = { price: productFormSchema.shape.price, stock: productFormSchema.shape.stock };

/**
 * Célula editável no lugar: lápis → campo numérico; Enter salva, Esc cancela. Valida com as mesmas
 * regras do formulário (preço > 0; estoque inteiro ≥ 0) e mostra o erro sem sair da edição.
 */
export function EditableCell({ field, title, value, display, onSave }: EditableCellProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<number | string>(value ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const start = () => {
    setDraft(value ?? "");
    setError(null);
    setEditing(true);
  };
  const cancel = () => setEditing(false);

  const save = async () => {
    const parsed = schemas[field].safeParse(draft === "" ? undefined : draft);
    if (!parsed.success) {
      const key = parsed.error.issues[0]?.message ?? "";
      setError(t(key, { defaultValue: key }));
      return;
    }
    if (parsed.data === value) return cancel(); // nada mudou
    setSaving(true);
    try {
      await onSave(parsed.data);
      setEditing(false);
    } catch {
      // a camada de API já mostra a notificação de erro; mantém a edição aberta
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <Group gap={4} justify="flex-end" wrap="nowrap">
        <Text size="sm">{display}</Text>
        <ActionIcon
          variant="subtle"
          size="sm"
          aria-label={t(field === "price" ? "admin.editPrice" : "admin.editStock", { title })}
          onClick={start}
        >
          <IconPencil size={14} />
        </ActionIcon>
      </Group>
    );
  }

  return (
    <Group gap={4} justify="flex-end" wrap="nowrap" align="flex-start">
      <NumberInput
        size="xs"
        w={field === "price" ? 120 : 84}
        autoFocus
        min={0}
        allowNegative={false}
        allowDecimal={field === "price"}
        decimalScale={field === "price" ? 2 : 0}
        prefix={field === "price" ? "US$ " : undefined}
        value={draft}
        onChange={setDraft}
        error={error ?? undefined}
        disabled={saving}
        aria-label={t(field === "price" ? "admin.editPriceInput" : "admin.editStockInput", {
          title,
        })}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void save();
          } else if (event.key === "Escape") {
            event.preventDefault();
            cancel();
          }
        }}
      />
      <ActionIcon
        size="sm"
        mt={4}
        variant="light"
        loading={saving}
        aria-label={t("admin.saveEdit")}
        onClick={() => void save()}
      >
        <IconCheck size={14} />
      </ActionIcon>
      <ActionIcon
        size="sm"
        mt={4}
        variant="subtle"
        color="gray"
        aria-label={t("admin.cancelEdit")}
        onClick={cancel}
        disabled={saving}
      >
        <IconX size={14} />
      </ActionIcon>
    </Group>
  );
}
