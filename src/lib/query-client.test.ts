import { AxiosError, type AxiosResponse } from "axios";
import { InvalidResponseError } from "../services/products-service";
import { shouldRetry } from "./query-client";

const httpError = (status: number) =>
  new AxiosError("x", "ERR", undefined, undefined, { status } as AxiosResponse);

describe("shouldRetry", () => {
  it("repete uma vez falhas de rede (sem resposta)", () => {
    const network = new AxiosError("Network Error");
    expect(shouldRetry(0, network)).toBe(true);
    expect(shouldRetry(1, network)).toBe(false);
  });

  it("repete uma vez erros 5xx", () => {
    expect(shouldRetry(0, httpError(503))).toBe(true);
    expect(shouldRetry(1, httpError(503))).toBe(false);
  });

  it.each([400, 401, 404])("não repete %i (erro do cliente)", (status) => {
    expect(shouldRetry(0, httpError(status))).toBe(false);
  });

  it("não repete resposta fora do schema", () => {
    expect(shouldRetry(0, new InvalidResponseError("produtos"))).toBe(false);
  });
});
