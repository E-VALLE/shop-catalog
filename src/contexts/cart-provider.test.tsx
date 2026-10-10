import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { useCart } from "../hooks/use-cart";
import type { Product } from "../schemas/product-schema";
import { CART_KEY, CartProvider } from "./cart-provider";

const product: Product = {
  id: 1,
  title: "Mouse",
  description: "Mouse sem fio",
  category: "accessories",
  price: 10,
  thumbnail: "t.png",
  images: [],
};

const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;

describe("useCart", () => {
  it("lança erro fora do Provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useCart())).toThrow(/CartProvider/);
    spy.mockRestore();
  });

  it("soma quantidades do mesmo produto e calcula totais", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(product));
    act(() => result.current.addItem(product, 2));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.totalItems).toBe(3);
    expect(result.current.totalPrice).toBe(30);
  });

  it("ignora quantidade inválida ao adicionar", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(product, 0));
    act(() => result.current.addItem(product, -2));
    expect(result.current.items).toEqual([]);
  });

  it("remove o item ao definir quantidade 0 e esvazia o carrinho", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(product));
    act(() => result.current.setQuantity(1, 0));
    expect(result.current.items).toEqual([]);
    expect(result.current.totalPrice).toBe(0);
  });

  it("persiste no localStorage e ignora dados corrompidos", () => {
    const { result, unmount } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(product));
    expect(JSON.parse(localStorage.getItem(CART_KEY)!)).toHaveLength(1);
    unmount();

    localStorage.setItem(CART_KEY, "{corrompido");
    const again = renderHook(() => useCart(), { wrapper });
    expect(again.result.current.items).toEqual([]);
  });
});
