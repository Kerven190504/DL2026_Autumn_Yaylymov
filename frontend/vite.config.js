import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Проксируем /api на бэкенд ИЗ САМОГО vite-процесса (он всегда видит
// localhost:8000, т.к. работает на той же машине, что и бэкенд).
// Раньше фронтенд сам ходил на `${текущий host}:8000` — это ломалось
// на некоторых сетях/туннелях, где проброшен только порт 5173, а 8000
// снаружи недоступен (например, часть VPN/туннельных конфигураций).
// С прокси браузеру вообще не нужно знать про порт 8000: он всегда
// обращается на тот же адрес, с которого загрузил страницу.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // слушать на всех интерфейсах — иначе с телефона по LAN IP страница не откроется
    proxy: {
      "/api": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
  preview: {
    port: 5173,
    host: true,
    proxy: {
      "/api": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
});
