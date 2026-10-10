import { Button, Container, Stack, Text, Title } from "@mantine/core";
import { IconLock } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useDocumentTitle } from "../hooks/use-document-title";

/** Mostrada a quem está logado mas não tem o papel exigido pela rota (ex.: cliente em /admin). */
export function AccessDenied() {
  const { t } = useTranslation();
  useDocumentTitle(t("forbidden.title"));
  return (
    <Container size="sm" py="xl">
      <Stack align="center">
        <IconLock size={40} aria-hidden />
        <Title order={1}>{t("forbidden.title")}</Title>
        <Text c="dimmed" ta="center">
          {t("forbidden.text")}
        </Text>
        <Button component={Link} to="/">
          {t("common.backToStore")}
        </Button>
      </Stack>
    </Container>
  );
}
