import { defineConfig, configDefaults } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    globalSetup: ["tests/setup-global.ts"],
    fileParallelism: false, // os testes compartilham o banco de teste
    testTimeout: 15000, // banco remoto (Railway) + bcrypt custo 12 podem exceder o padrão de 5s
    // O banco de teste é remoto (Railway) e sujeito a jitter de rede (P1001/timeout). Um erro real
    // falha nas 3 tentativas; uma falha transitória de conexão é absorvida. Não mascara bug de lógica.
    retry: 2,
    // ignora worktrees de sessões/tarefas paralelas do Claude Code, senão seus testes rodam em dobro
    exclude: [...configDefaults.exclude, ".claude/**"],
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
