import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { notifications } from "@mantine/notifications";
import { afterEach, beforeEach, vi } from "vitest";
import i18n from "./i18n";

// Os testes de interface assertam textos em português, salvo quando trocam o idioma.
beforeEach(async () => {
  await i18n.changeLanguage("pt-BR");
});

afterEach(() => {
  cleanup();
  notifications.clean(); // a fila de notificações é global: não vaza entre testes
  localStorage.clear();
});

// jsdom não implementa estes recursos usados pelo Mantine.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverStub;
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

// jsdom não tem `document.fonts` (usado pelo autosize do Textarea).
Object.defineProperty(document, "fonts", {
  configurable: true,
  value: { addEventListener() {}, removeEventListener() {}, ready: Promise.resolve() },
});
