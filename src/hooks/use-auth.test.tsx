import { notifications } from "@mantine/notifications";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { AuthProvider } from "../contexts/auth-provider";
import { TOKEN_KEY } from "../services/api";
import * as authService from "../services/auth-service";
import { useAuth } from "./use-auth";

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

describe("useAuth", () => {
  afterEach(() => vi.restoreAllMocks());

  it("lança erro fora do Provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
    spy.mockRestore();
  });

  it("autentica, persiste o token e faz logout", async () => {
    vi.spyOn(authService, "login").mockResolvedValue({
      id: 1,
      username: "emilys",
      firstName: "Emily",
      lastName: "Johnson",
      accessToken: "jwt-token",
    });
    vi.spyOn(authService, "fetchRole").mockResolvedValue("admin");
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isAdmin).toBe(false);

    await act(() => result.current.signIn({ username: "emilys", password: "emilyspass" }));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.user?.role).toBe("admin");
    expect(localStorage.getItem(TOKEN_KEY)).toBe("jwt-token");

    act(() => result.current.signOut());
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it("cliente (papel user) entra, mas não é admin", async () => {
    vi.spyOn(authService, "login").mockResolvedValue({
      id: 16,
      username: "averyp",
      firstName: "Avery",
      lastName: "Perez",
      accessToken: "jwt-token",
    });
    vi.spyOn(authService, "fetchRole").mockResolvedValue("user");
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(() => result.current.signIn({ username: "averyp", password: "averyppass" }));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });

  it("moderador não é admin (só admin acessa a área administrativa)", async () => {
    vi.spyOn(authService, "login").mockResolvedValue({
      id: 2,
      username: "moda",
      firstName: "M",
      lastName: "O",
      accessToken: "jwt-token",
    });
    vi.spyOn(authService, "fetchRole").mockResolvedValue("moderator");
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.signIn({ username: "moda", password: "123456" }));
    expect(result.current.isAdmin).toBe(false);
  });

  it("sessão salva sem papel (de antes desta versão) vale como cliente", () => {
    localStorage.setItem(TOKEN_KEY, "tok");
    localStorage.setItem(
      "shop-catalog:user",
      JSON.stringify({ id: 1, username: "emilys", firstName: "Emily", lastName: "Johnson" }),
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });

  it("não autentica quando o login falha", async () => {
    vi.spyOn(authService, "login").mockRejectedValue(new Error("400"));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await expect(result.current.signIn({ username: "x", password: "123456" })).rejects.toThrow();
    });
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  describe("expiração e dados salvos", () => {
    const USER_KEY = "shop-catalog:user";
    const user = { id: 1, username: "emilys", firstName: "Emily", lastName: "Johnson" };
    const b64url = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, "");
    const jwt = (exp: number) => `${b64url({ alg: "HS256" })}.${b64url({ exp })}.sig`;
    const save = (token: string, storedUser: unknown = user) => {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(storedUser));
    };

    afterEach(() => vi.useRealTimers());

    it("descarta uma sessão salva cujo token já expirou", () => {
      save(jwt(Math.floor(Date.now() / 1000) - 60));
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(USER_KEY)).toBeNull();
    });

    it("restaura a sessão quando o token ainda vale", () => {
      save(jwt(Math.floor(Date.now() / 1000) + 3600));
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.firstName).toBe("Emily");
    });

    it("token opaco (sem exp legível) é mantido: quem decide é o servidor (401)", () => {
      save("mock-access-token");
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.isAuthenticated).toBe(true);
    });

    it.each([
      ["JSON corrompido", "{ruim"],
      ["campos de tipo errado", JSON.stringify({ ...user, id: "1" })],
      ["não é objeto", JSON.stringify("emilys")],
    ])("descarta o usuário salvo inválido (%s) e limpa o token", (_label, rawUser) => {
      localStorage.setItem(TOKEN_KEY, "mock-access-token");
      localStorage.setItem(USER_KEY, rawUser);
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it("desloga sozinho quando o prazo do token termina, avisando o usuário", () => {
      vi.useFakeTimers();
      const show = vi.spyOn(notifications, "show").mockReturnValue("id");
      const nowSeconds = Math.floor(Date.now() / 1000);
      save(jwt(nowSeconds + 120));
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.isAuthenticated).toBe(true);

      act(() => vi.advanceTimersByTime(119_000));
      expect(result.current.isAuthenticated).toBe(true);

      act(() => vi.advanceTimersByTime(2_000));
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(show).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Sua sessão expirou. Entre novamente." }),
      );
    });

    it("limpa o timer ao desmontar (sem deslogar nem vazar)", () => {
      vi.useFakeTimers();
      save(jwt(Math.floor(Date.now() / 1000) + 120));
      const { unmount } = renderHook(() => useAuth(), { wrapper });
      expect(vi.getTimerCount()).toBeGreaterThan(0);
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
