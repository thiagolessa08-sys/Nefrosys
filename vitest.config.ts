import { defineConfig, configDefaults } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    globalSetup: ["tests/setup-global.ts"],
    fileParallelism: false, // os testes compartilham o mesmo banco local
    testTimeout: 15000, // bcrypt custo 12 em vários testes pode exceder o padrão de 5s
    // ignora worktrees de sessões/tarefas paralelas do Claude Code, senão seus testes rodam em dobro
    exclude: [...configDefaults.exclude, ".claude/**"],
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
