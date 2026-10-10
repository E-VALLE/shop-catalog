import { notifications } from "@mantine/notifications";
import {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { TOKEN_KEY, UNAUTHORIZED_EVENT, api, getApiErrorMessage } from "./api";

type Reply = { status: number; data?: unknown } | "network-error";

/** Adaptador falso: exercita os interceptors reais sem rede. */
function mockAdapter(reply: Reply, seen: InternalAxiosRequestConfig[] = []): AxiosAdapter {
  return (config) => {
    seen.push(config);
    if (reply === "network-error")
      return Promise.reject(new AxiosError("Network Error", "ERR_NETWORK", config));
    const response = {
      ...reply,
      data: reply.data ?? {},
      headers: {},
      config,
      statusText: "",
    } as AxiosResponse;
    return reply.status >= 400
      ? Promise.reject(new AxiosError("fail", "ERR_BAD_RESPONSE", config, undefined, response))
      : Promise.resolve(response);
  };
}

describe("api: interceptors", () => {
  const original = api.defaults.adapter;
  afterEach(() => {
    api.defaults.adapter = original;
    vi.restoreAllMocks();
  });

  it("injeta Authorization: Bearer quando há token", async () => {
    localStorage.setItem(TOKEN_KEY, "abc.def.ghi");
    const seen: InternalAxiosRequestConfig[] = [];
    api.defaults.adapter = mockAdapter({ status: 200 }, seen);
    await api.get("/products");
    expect(seen[0].headers.Authorization).toBe("Bearer abc.def.ghi");
  });

  it("não envia Authorization sem token", async () => {
    const seen: InternalAxiosRequestConfig[] = [];
    api.defaults.adapter = mockAdapter({ status: 200 }, seen);
    await api.get("/products");
    expect(seen[0].headers.Authorization).toBeUndefined();
  });

  it("401 fora do login dispara o evento de logout e notifica", async () => {
    const show = vi.spyOn(notifications, "show").mockReturnValue("id");
    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);
    api.defaults.adapter = mockAdapter({ status: 401, data: { message: "Token Expired!" } });

    await expect(api.get("/products")).rejects.toBeInstanceOf(AxiosError);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Token Expired!", color: "red" }),
    );
    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
  });

  it("falha no login (400) não derruba a sessão nem mostra notificação (o formulário trata)", async () => {
    const show = vi.spyOn(notifications, "show").mockReturnValue("id");
    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);
    api.defaults.adapter = mockAdapter({ status: 400, data: { message: "Invalid credentials" } });

    await expect(api.post("/auth/login", {})).rejects.toBeInstanceOf(AxiosError);
    expect(listener).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
  });

  it("401 no próprio login também não dispara logout", async () => {
    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);
    api.defaults.adapter = mockAdapter({ status: 401 });
    await expect(api.post("/auth/login", {})).rejects.toBeInstanceOf(AxiosError);
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
  });

  it("falha na consulta do papel (/auth/me) é silenciosa: sem notificação", async () => {
    const show = vi.spyOn(notifications, "show");
    api.defaults.adapter = mockAdapter({ status: 500 });
    await expect(api.get("/auth/me")).rejects.toBeInstanceOf(AxiosError);
    expect(show).not.toHaveBeenCalled();
  });

  it("401 em /auth/me ainda derruba a sessão (token inválido)", async () => {
    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);
    api.defaults.adapter = mockAdapter({ status: 401 });
    await expect(api.get("/auth/me")).rejects.toBeInstanceOf(AxiosError);
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
  });

  it("falha de rede mostra mensagem amigável, sem logout", async () => {
    const show = vi.spyOn(notifications, "show").mockReturnValue("id");
    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);
    api.defaults.adapter = mockAdapter("network-error");

    await expect(api.get("/products")).rejects.toBeInstanceOf(AxiosError);
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("conectar") }),
    );
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
  });

  it("erro 500 sem corpo conhecido usa a mensagem genérica", async () => {
    const show = vi.spyOn(notifications, "show").mockReturnValue("id");
    api.defaults.adapter = mockAdapter({ status: 500, data: "<html>boom</html>" });
    await expect(api.get("/products")).rejects.toBeInstanceOf(AxiosError);
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/inesperado/i) }),
    );
  });
});

describe("getApiErrorMessage", () => {
  it("usa a mensagem da API quando válida", () => {
    const error = new AxiosError("x", "E", undefined, undefined, {
      status: 404,
      data: { message: "Product with id '999' not found" },
    } as AxiosResponse);
    expect(getApiErrorMessage(error)).toBe("Product with id '999' not found");
  });

  it.each([new Error("x"), "texto", null, undefined])(
    "erro desconhecido (%s) → mensagem genérica",
    (error) => {
      expect(getApiErrorMessage(error)).toMatch(/inesperado/i);
    },
  );
});
