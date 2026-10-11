import { Anchor, Center, Container, Group, Stack, Text, Title } from "@mantine/core";
import { IconShoppingBag } from "@tabler/icons-react";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { LoadingState } from "../components/status-message";
import { Link, Outlet } from "react-router";
import { LanguageSwitcher } from "../components/language-switcher";
import { MAIN_CONTENT_ID, SkipLink } from "../components/skip-link";

export function AuthLayout() {
  const { t } = useTranslation();
  return (
    <>
      <SkipLink />
      <Center mih="100vh">
        <Container size="xs" w="100%" py="xl">
          <Stack align="center">
            <Group justify="flex-end" w="100%">
              <LanguageSwitcher />
            </Group>
            <Anchor component={Link} to="/" underline="never" c="inherit">
              <Stack align="center" gap="xs">
                <IconShoppingBag size={36} />
                <Title order={2}>Shop Catalog</Title>
              </Stack>
            </Anchor>
            <Stack
              component="main"
              id={MAIN_CONTENT_ID}
              tabIndex={-1}
              w="100%"
              style={{ outline: "none" }}
            >
              <Suspense fallback={<LoadingState />}>
                <Outlet />
              </Suspense>
            </Stack>
            <Text size="sm" c="dimmed">
              <Anchor component={Link} to="/" size="sm">
                {t("common.backToStore")}
              </Anchor>
            </Text>
            <Text size="xs" c="dimmed" ta="center">
              {t("login.noSignupNote")}
            </Text>
          </Stack>
        </Container>
      </Center>
    </>
  );
}
