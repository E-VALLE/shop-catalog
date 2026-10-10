import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { notifications } from "@mantine/notifications";
import i18n from "../i18n";
import { isTokenExpired, msUntilExpiry } from "../lib/jwt";
import { fetchRole, login } from "../services/auth-service";
import { TOKEN_KEY, UNAUTHORIZED_EVENT } from "../services/api";
import type { LoginValues } from "../schemas/login-schema";
import { sessionUserSchema, type SessionUser } from "../schemas/session-schema";
import { AuthContext } from "./auth-context-value";

const USER_KEY = "shop-catalog:user";

/** setTimeout aceita no máximo 2^31-1 ms (~24,8 dias); acima disso dispara na hora. */
const MAX_TIMER_MS = 2 ** 31 - 1;

function clearStoredSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // armazenamento indisponível
  }
}

/** Sessão salva: usuário validado com Zod e token ainda dentro do prazo; qualquer outra coisa é descartada. */
function readStoredUser(): SessionUser | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(USER_KEY);
    if (!token || !raw) return null;

    const user = sessionUserSchema.safeParse(JSON.parse(raw));
    if (!user.success || isTokenExpired(token)) {
      clearStoredSession();
      return null;
    }
    return user.data;
  } catch {
    clearStoredSession();
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(readStoredUser);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const signIn = useCallback(async (values: LoginValues) => {
    const { accessToken, ...profile } = await login(values);
    // O token precisa estar salvo antes: o interceptor o envia na consulta do papel.
    localStorage.setItem(TOKEN_KEY, accessToken);
    const role = await fetchRole();
    const sessionUser: SessionUser = {
      id: profile.id,
      username: profile.username,
      firstName: profile.firstName,
      lastName: profile.lastName,
      role,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);
    return sessionUser;
  }, []);

  // Expiração do JWT: desloga quando o prazo do token termina, com aviso (o servidor continua sendo
  // a fonte de verdade; isto só evita a tela "logada" com um token que já não vale).
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem(TOKEN_KEY);
    const delay = token ? msUntilExpiry(token) : null;
    if (delay === null) return;

    const expire = () => {
      signOut();
      notifications.show({ message: i18n.t("auth.sessionExpired"), color: "orange" });
    };
    if (delay >= MAX_TIMER_MS) return; // longe demais para agendar; a checagem na abertura cobre
    const timer = setTimeout(expire, delay);
    return () => clearTimeout(timer);
  }, [user, signOut]);

  // Sessão expirada (401) ou logout em outra aba.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY && !e.newValue) setUser(null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, signOut);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, signOut);
      window.removeEventListener("storage", onStorage);
    };
  }, [signOut]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      isAdmin: user?.role === "admin",
      signIn,
      signOut,
    }),
    [user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
