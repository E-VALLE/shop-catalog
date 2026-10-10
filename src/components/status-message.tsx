import { Alert, Button, Center, Loader, Stack, Text } from "@mantine/core";
import { IconAlertCircle, IconPackageOff } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export function LoadingState({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <Center py="xl">
      <Stack align="center" gap="xs" role="status">
        <Loader />
        <Text c="dimmed" size="sm">
          {label ?? t("common.loading")}
        </Text>
      </Stack>
    </Center>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <Alert color="red" icon={<IconAlertCircle size={20} />} title={t("common.errorTitle")}>
      <Text size="sm">{message}</Text>
      {onRetry && (
        <Button mt="md" variant="light" color="red" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      )}
    </Alert>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Center py="xl">
      <Stack align="center" gap="xs">
        <IconPackageOff size={40} />
        <Text fw={700}>{title}</Text>
        {children}
      </Stack>
    </Center>
  );
}
