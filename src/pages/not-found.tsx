import { Button, Container, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useDocumentTitle } from "../hooks/use-document-title";
import { Link } from "react-router";

export function NotFound() {
  const { t } = useTranslation();
  useDocumentTitle(t("notFound.title"));
  return (
    <Container size="sm" py="xl">
      <Stack align="center">
        <Title order={1}>{t("notFound.title")}</Title>
        <Text c="dimmed">{t("notFound.text")}</Text>
        <Button component={Link} to="/">
          {t("notFound.back")}
        </Button>
      </Stack>
    </Container>
  );
}
