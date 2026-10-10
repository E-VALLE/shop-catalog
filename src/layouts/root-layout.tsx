import type { ParseKeys } from "i18next";
import {
  ActionIcon,
  Anchor,
  Box,
  AppShell,
  Burger,
  Button,
  Container,
  Group,
  Indicator,
  Menu,
  Stack,
  NavLink as MantineNavLink,
  Text,
  Title,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconHeart,
  IconHome,
  IconLayoutDashboard,
  IconLogin,
  IconLogout,
  IconMoon,
  IconPackage,
  IconShoppingBag,
  IconShoppingCart,
  IconSun,
  type Icon,
} from "@tabler/icons-react";
import { Link, NavLink as RouterNavLink, Outlet, useLocation } from "react-router";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { CompareBar } from "../components/compare-bar";
import { CurrencySwitcher } from "../components/currency-switcher";
import { LanguageSwitcher } from "../components/language-switcher";
import { ErrorBoundary } from "../components/error-boundary";
import { ErrorFallback } from "../components/error-fallback";
import { LoadingState } from "../components/status-message";
import { CurrencyNote } from "../components/currency-note";
import { SkipLink } from "../components/skip-link";
import { UserAvatar } from "../components/user-avatar";
import { FAVORITE_ICON_COLOR, HEADER_BG, HEADER_BORDER } from "../theme/surfaces";
import { useAuth } from "../hooks/use-auth";
import { useCart } from "../hooks/use-cart";
import { useFavorites } from "../hooks/use-favorites";
import { useScrollToTop } from "../hooks/use-scroll-to-top";

interface NavItem {
  to: string;
  labelKey: ParseKeys;
  icon: Icon;
  end?: boolean;
}

const PUBLIC_ITEMS: NavItem[] = [
  { to: "/", labelKey: "nav.home", icon: IconHome, end: true },
  { to: "/produtos", labelKey: "nav.products", icon: IconPackage },
];

const ADMIN_ITEMS: NavItem[] = [
  { to: "/admin", labelKey: "nav.dashboard", icon: IconLayoutDashboard, end: true },
  { to: "/admin/produtos", labelKey: "nav.manageProducts", icon: IconPackage },
];

export function RootLayout() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const { user, isAuthenticated, isAdmin, signOut } = useAuth();
  const { totalItems } = useCart();
  const { count: favoritesCount } = useFavorites();
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { setColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme("light");
  useScrollToTop(); // nova rota abre no topo, não na rolagem da anterior

  const items = isAdmin ? [...PUBLIC_ITEMS, ...ADMIN_ITEMS] : PUBLIC_ITEMS;

  const isActive = ({ to, end }: NavItem) =>
    end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

  const handleSignOut = () => {
    // Em rotas /admin, o ProtectedRoute redireciona para /login; nas públicas, permanece na página.
    signOut();
    close();
  };

  return (
    <>
      <SkipLink />
      <AppShell
        header={{ height: 64 }}
        navbar={{ width: 260, breakpoint: "md", collapsed: { desktop: true, mobile: !opened } }}
        padding={0}
      >
        <AppShell.Header bg={HEADER_BG} style={{ borderBottomColor: HEADER_BORDER }}>
          <Container size="lg" h="100%">
            <Group h="100%" justify="space-between" wrap="nowrap">
              <Group wrap="nowrap">
                <Burger
                  opened={opened}
                  onClick={toggle}
                  hiddenFrom="md"
                  size="sm"
                  aria-label={t("nav.openMenu")}
                />
                <Anchor component={Link} to="/" underline="never" c="inherit">
                  <Group gap="xs">
                    <IconShoppingBag size={24} />
                    <Title order={3} visibleFrom="xs">
                      Shop Catalog
                    </Title>
                  </Group>
                </Anchor>
              </Group>

              <Group
                gap={4}
                wrap="nowrap"
                visibleFrom="md"
                component="nav"
                aria-label={t("nav.mainNav")}
              >
                {items.map((item) => (
                  <Button
                    key={item.to}
                    component={RouterNavLink}
                    to={item.to}
                    end={item.end}
                    variant={isActive(item) ? "light" : "subtle"}
                    size="sm"
                    leftSection={
                      <Box component="span" visibleFrom="xl" display="inline-flex">
                        <item.icon size={18} />
                      </Box>
                    }
                  >
                    {t(item.labelKey)}
                  </Button>
                ))}
              </Group>

              <Group gap="xs" wrap="nowrap">
                <LanguageSwitcher />
                {/* Abaixo de "xs" não há espaço no cabeçalho: o seletor de moeda vai para o menu móvel. */}
                <Box visibleFrom="xs">
                  <CurrencySwitcher />
                </Box>

                <ActionIcon
                  variant="subtle"
                  size="lg"
                  aria-label={t("nav.toggleTheme")}
                  onClick={() => setColorScheme(scheme === "dark" ? "light" : "dark")}
                >
                  {scheme === "dark" ? <IconSun size={20} /> : <IconMoon size={20} />}
                </ActionIcon>

                {/* Abaixo de "xs" o atalho some do cabeçalho (sem espaço) e fica no menu móvel. */}
                <Indicator
                  label={favoritesCount}
                  disabled={favoritesCount === 0}
                  size={18}
                  offset={4}
                  visibleFrom="xs"
                  color="pink.8"
                >
                  <ActionIcon
                    component={Link}
                    to="/favoritos"
                    variant="subtle"
                    color="pink"
                    c={FAVORITE_ICON_COLOR}
                    size="lg"
                    aria-label={t("nav.favoritesAria", { count: favoritesCount })}
                  >
                    <IconHeart size={20} />
                  </ActionIcon>
                </Indicator>

                <Indicator label={totalItems} disabled={totalItems === 0} size={18} offset={4}>
                  <ActionIcon
                    component={Link}
                    to="/carrinho"
                    variant="subtle"
                    size="lg"
                    aria-label={t("nav.cartAria", { count: totalItems })}
                  >
                    <IconShoppingCart size={20} />
                  </ActionIcon>
                </Indicator>

                {isAuthenticated && user ? (
                  <Menu position="bottom-end" withinPortal>
                    <Menu.Target>
                      <ActionIcon variant="subtle" size="lg" aria-label={t("nav.userMenu")}>
                        <UserAvatar user={user} size={28} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Label>
                        <Group gap="xs" wrap="nowrap">
                          <UserAvatar user={user} size={24} />
                          <Text size="sm" fw={500} truncate>
                            {user.firstName} {user.lastName}
                          </Text>
                        </Group>
                      </Menu.Label>
                      {isAdmin && (
                        <Menu.Item
                          leftSection={<IconLayoutDashboard size={18} />}
                          component={Link}
                          to="/admin"
                        >
                          {t("nav.admin")}
                        </Menu.Item>
                      )}
                      <Menu.Item
                        color="red"
                        leftSection={<IconLogout size={18} />}
                        onClick={handleSignOut}
                      >
                        {t("nav.logout")}
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                ) : (
                  <Button
                    component={Link}
                    to="/login"
                    size="sm"
                    visibleFrom="sm"
                    leftSection={<IconLogin size={18} />}
                  >
                    {t("nav.login")}
                  </Button>
                )}
              </Group>
            </Group>
          </Container>
        </AppShell.Header>

        {/* Menu móvel: não existe em telas ≥ sm (display:none) e, fechado, fica `inert` — sem isso o Mantine
            só o desloca para fora da tela e o teclado/leitor de tela ainda passava por ele. */}
        <AppShell.Navbar
          p="md"
          component="nav"
          aria-label={t("nav.mobileNav")}
          hiddenFrom="md"
          inert={!opened}
        >
          {items.map((item) => (
            <MantineNavLink
              key={item.to}
              component={RouterNavLink}
              to={item.to}
              end={item.end}
              label={t(item.labelKey)}
              leftSection={<item.icon size={20} />}
              active={isActive(item)}
              onClick={close}
            />
          ))}
          <MantineNavLink
            component={RouterNavLink}
            to="/favoritos"
            label={
              favoritesCount > 0 ? `${t("nav.favorites")} (${favoritesCount})` : t("nav.favorites")
            }
            leftSection={<IconHeart size={20} />}
            active={pathname === "/favoritos"}
            onClick={close}
          />
          {!isAuthenticated && (
            <MantineNavLink
              component={Link}
              to="/login"
              label={t("nav.login")}
              leftSection={<IconLogin size={20} />}
              onClick={close}
            />
          )}
          <Group mt="md" px="xs">
            <CurrencySwitcher />
          </Group>
        </AppShell.Navbar>

        <AppShell.Main id="main-content" tabIndex={-1} style={{ outline: "none" }}>
          <ErrorBoundary
            resetKey={pathname}
            fallback={(reset) => <ErrorFallback onRetry={reset} />}
          >
            <Suspense fallback={<LoadingState />}>
              <Outlet />
              <CompareBar />
            </Suspense>
          </ErrorBoundary>
          <Container size="lg" py="xl">
            <Stack gap="xs">
              <CurrencyNote />
              <Text size="sm" c="dimmed" ta="center">
                {t("nav.footer")}
              </Text>
            </Stack>
          </Container>
        </AppShell.Main>
      </AppShell>
    </>
  );
}
