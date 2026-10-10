import { SegmentedControl, VisuallyHidden } from "@mantine/core";
import { IconLayoutGrid, IconList } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { parseView, type ViewMode } from "../helpers/view";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (view: ViewMode) => void;
}

/** Alterna entre grade e lista (ícones com texto acessível). */
export function ViewToggle({ value, onChange }: ViewToggleProps) {
  const { t } = useTranslation();
  return (
    <SegmentedControl
      aria-label={t("products.view.label")}
      value={value}
      onChange={(next) => {
        const view = parseView(next);
        if (view) onChange(view);
      }}
      data={[
        {
          value: "grade",
          label: (
            <>
              <IconLayoutGrid size={18} aria-hidden />
              <VisuallyHidden>{t("products.view.grid")}</VisuallyHidden>
            </>
          ),
        },
        {
          value: "lista",
          label: (
            <>
              <IconList size={18} aria-hidden />
              <VisuallyHidden>{t("products.view.list")}</VisuallyHidden>
            </>
          ),
        },
      ]}
    />
  );
}
