import '@testing-library/jest-dom/vitest';

// jsdom nao implementa ResizeObserver; componentes Radix (ex.: Checkbox usado no
// "Lembrar meu acesso" do AuthLoginCard) dependem dele em efeitos de layout.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
