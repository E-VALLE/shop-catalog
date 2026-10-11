import { Alert, Button, Card, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconInfoCircle, IconLock, IconUser } from "@tabler/icons-react";
import { isAxiosError } from "axios";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "../hooks/use-auth";
import { useDocumentTitle } from "../hooks/use-document-title";
import { loginSchema, type LoginValues } from "../schemas/login-schema";
import { parseCheckoutState } from "../schemas/session-schema";
import { getApiErrorMessage } from "../services/api";

export function Login() {
  const { t } = useTranslation();
  const { user, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = parseCheckoutState(location.state);
  // Sem destino pedido: o admin vai para o painel; o cliente, para a loja.
  const homeFor = (role: string | undefined) => (role === "admin" ? "/admin" : "/");
  const from = locationState.from ?? homeFor(user?.role);
  const fromCheckout = locationState.checkout === true;
  useDocumentTitle(t("login.submit"));
  // Repassa a intenção de checkout para a rota de destino retomar a compra.
  const returnState = fromCheckout ? { checkout: true } : undefined;
  const [submitting, setSubmitting] = useState(false);
  // Credencial recusada: um único alerta acima do formulário (não repetido sob cada campo).
  const [credentialsError, setCredentialsError] = useState(false);

  const form = useForm<LoginValues>({
    mode: "uncontrolled",
    initialValues: { username: "", password: "" },
    validate: zod4Resolver(loginSchema),
  });

  if (isAuthenticated) return <Navigate to={from} replace state={returnState} />;

  const handleSubmit = async (values: LoginValues) => {
    setSubmitting(true);
    setCredentialsError(false);
    try {
      const signedIn = await signIn(values);
      notifications.show({ message: t("login.success"), color: "green" });
      navigate(locationState.from ?? homeFor(signedIn.role), { replace: true, state: returnState });
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 400) {
        setCredentialsError(true);
      } else {
        notifications.show({
          title: t("login.errorTitle"),
          message: getApiErrorMessage(error),
          color: "red",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Os erros do Zod são chaves de tradução; erros da API já vêm traduzidos.
  const fieldProps = (name: keyof LoginValues) => {
    const props = form.getInputProps(name);
    return {
      ...props,
      error:
        typeof props.error === "string"
          ? t(props.error, { defaultValue: props.error })
          : props.error,
    };
  };

  return (
    <Card w="100%" component="section" aria-labelledby="login-title">
      <Title order={1} id="login-title">
        {fromCheckout ? t("login.titleCheckout") : t("login.title")}
      </Title>
      {fromCheckout && (
        <Alert variant="light" color="green" icon={<IconInfoCircle size={20} />}>
          <Text size="sm">{t("login.cartKept")}</Text>
        </Alert>
      )}
      <Alert variant="light" icon={<IconInfoCircle size={20} />}>
        <Stack gap={4}>
          <Text size="sm" fw={600} ta="center">
            {t("login.demoTitle")}
          </Text>
          <Text size="sm">
            <Trans i18nKey="login.demoAdmin" components={{ b: <b /> }} />
          </Text>
          <Text size="sm">
            <Trans i18nKey="login.demoCustomer" components={{ b: <b /> }} />
          </Text>
        </Stack>
      </Alert>
      {credentialsError && (
        <Alert color="red" icon={<IconAlertCircle size={20} />} role="alert">
          <Text size="sm">{t("login.invalid")}</Text>
        </Alert>
      )}
      <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
        <Stack>
          <TextInput
            label={t("login.username")}
            placeholder={t("login.usernamePlaceholder")}
            autoComplete="username"
            leftSection={<IconUser size={18} />}
            key={form.key("username")}
            {...fieldProps("username")}
          />
          <PasswordInput
            label={t("login.password")}
            placeholder={t("login.passwordPlaceholder")}
            autoComplete="current-password"
            leftSection={<IconLock size={18} />}
            key={form.key("password")}
            {...fieldProps("password")}
          />
          <Button type="submit" fullWidth loading={submitting}>
            {t("login.submit")}
          </Button>
        </Stack>
      </form>
    </Card>
  );
}
