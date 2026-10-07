import { defineConfig } from "vite";

export default defineConfig({
  // Caminhos relativos no build: o mesmo dist/ abre por http ou por file://
  // (é o que um empacotador tipo Electron carrega).
  base: "./",
  server: {
    port: 5173,
  },
});
