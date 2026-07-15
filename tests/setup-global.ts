import { execSync } from "node:child_process";
import { config } from "dotenv";

export default function configurarBancoDeTeste() {
  config({ path: ".env.test", override: true });
  execSync("npx prisma migrate deploy", { env: { ...process.env }, stdio: "inherit" });
}
