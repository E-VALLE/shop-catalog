import { lazy } from "react";
import { Route, Routes } from "react-router";
import { AuthLayout } from "./layouts/auth-layout";
import { ProtectedRoute } from "./layouts/protected-route";
import { RootLayout } from "./layouts/root-layout";
import { Home } from "./pages/home";

// Code-splitting por rota: cada página (e o admin inteiro) vira um chunk carregado sob demanda.
const lazyPage = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(() => load().then((module) => ({ default: module[name] })));

const Products = lazyPage(() => import("./pages/products"), "Products");
const ProductDetails = lazyPage(() => import("./pages/product-details"), "ProductDetails");
const Cart = lazyPage(() => import("./pages/cart"), "Cart");
const Favorites = lazyPage(() => import("./pages/favorites"), "Favorites");
const Checkout = lazyPage(() => import("./pages/checkout"), "Checkout");
const Compare = lazyPage(() => import("./pages/compare"), "Compare");
const Login = lazyPage(() => import("./pages/login"), "Login");
const NotFound = lazyPage(() => import("./pages/not-found"), "NotFound");
const Dashboard = lazyPage(() => import("./pages/dashboard"), "Dashboard");
const AdminProducts = lazyPage(() => import("./pages/admin-products"), "AdminProducts");
const ProductFormPage = lazyPage(() => import("./pages/product-form-page"), "ProductFormPage");

export function AppRouter() {
  return (
    <Routes>
      <Route path="login" element={<AuthLayout />}>
        <Route index element={<Login />} />
      </Route>

      <Route element={<RootLayout />}>
        {/* Área pública */}
        <Route index element={<Home />} />
        <Route path="produtos" element={<Products />} />
        <Route path="produtos/:id" element={<ProductDetails />} />
        <Route path="carrinho" element={<Cart />} />
        <Route path="favoritos" element={<Favorites />} />
        <Route path="comparar" element={<Compare />} />
        <Route path="checkout" element={<ProtectedRoute />}>
          <Route index element={<Checkout />} />
        </Route>

        {/* Área administrativa protegida */}
        <Route path="admin" element={<ProtectedRoute role="admin" />}>
          <Route index element={<Dashboard />} />
          <Route path="produtos" element={<AdminProducts />} />
          <Route path="produtos/novo" element={<ProductFormPage />} />
          <Route path="produtos/:id/editar" element={<ProductFormPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
