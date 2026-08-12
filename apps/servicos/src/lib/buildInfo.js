// __APP_VERSION__ e injetado pelo vite.config.js (opcao `define`), lido direto do `version` do
// package.json no momento do build -- isolado num modulo proprio pra o resto do app nao
// depender de saber que e um global substituido em build time.
export const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
