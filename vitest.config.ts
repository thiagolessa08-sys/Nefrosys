import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    globalSetup: ["tests/setup-global.ts"],
    fileParallelism: false, // os testes compartilham o banco nefrosys_teste
    testTimeout: 15000, // banco remoto (Railway) + bcrypt custo 12 podem exceder o padrão de 5s
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
