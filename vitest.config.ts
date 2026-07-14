import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    globalSetup: ["tests/setup-global.ts"],
    fileParallelism: false, // os testes compartilham o banco nefrosys_teste
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
