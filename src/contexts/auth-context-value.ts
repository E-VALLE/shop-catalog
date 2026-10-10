import { createContext } from "react";
import type { LoginValues } from "../schemas/login-schema";
import type { SessionUser } from "../schemas/session-schema";

export type { SessionUser };

export interface AuthContextValue {
  user: SessionUser | null;
  isAuthenticated: boolean;
  /** Só o papel "admin" acessa a área administrativa (checagem de interface, não de segurança). */
  isAdmin: boolean;
  signIn: (values: LoginValues) => Promise<SessionUser>;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
