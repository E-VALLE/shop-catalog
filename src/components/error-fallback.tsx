import { Alert, Button, Container, Group, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <Container size="sm" py="xl">
      <Alert
        color="red"
        role="alert"
        icon={<IconAlertTriangle size={20} />}
        title={t("errors.boundaryTitle")}
      >
        <Text size="sm">{t("errors.boundaryBody")}</Text>
        <Group mt="md">
          <Button variant="light" color="red" onClick={onRetry}>
            {t("errors.boundaryRetry")}
          </Button>
          <Button component={Link} to="/" variant="subtle" onClick={onRetry}>
            {t("errors.boundaryHome")}
          </Button>
        </Group>
      </Alert>
    </Container>
  );
}
