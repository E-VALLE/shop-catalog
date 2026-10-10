import { Badge, Menu, UnstyledButton } from "@mantine/core";
import { IconCheck, IconWorld } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../hooks/use-language";
import { LANGUAGES } from "../i18n/detect-language";

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <UnstyledButton aria-label={`${t("language.label")}: ${t(`language.${language}`)}`}>
          <Badge
            variant="light"
            size="lg"
            leftSection={<IconWorld size={14} />}
            style={{ cursor: "pointer" }}
          >
            {t(`language.short.${language}`)}
          </Badge>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{t("language.label")}</Menu.Label>
        {LANGUAGES.map((code) => (
          <Menu.Item
            key={code}
            aria-current={code === language ? "true" : undefined}
            rightSection={code === language ? <IconCheck size={16} /> : null}
            onClick={() => setLanguage(code)}
          >
            {t(`language.${code}`)}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
