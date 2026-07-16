import { execFileSync, execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { config } from "dotenv";
import EmbeddedPostgres from "embedded-postgres";

// Banco de testes = PostgreSQL LOCAL efêmero (embedded-postgres), não o Railway.
// Motivo: o proxy do Railway é instável sob a carga de uma suíte inteira; local é rápido,
// isolado e confiável. Mantém paridade com produção (é Postgres de verdade, não SQLite).
// A URL local está em .env.test (porta 5433, banco nefrosys_teste).

const PORTA = 5433;
const USUARIO = "postgres";
const SENHA = "postgres";
const BANCO = "nefrosys_teste";
// Fora do OneDrive para evitar que a sincronização trave os arquivos de dados do Postgres.
const DIR_DADOS = path.join(tmpdir(), "nefrosys-pg-teste");

const URL_LOCAL = `postgresql://${USUARIO}:${SENHA}@localhost:${PORTA}/${BANCO}`;

// pg_ctl que acompanha o embedded-postgres (binário da plataforma em node_modules).
const PG_CTL = path.join(
  process.cwd(),
  "node_modules",
  "@embedded-postgres",
  "windows-x64",
  "native",
  "bin",
  "pg_ctl.exe",
);

// Encerra uma instância anterior que ficou de pé (teardown falho / execução interrompida).
// No Windows, matar o PID (SIGTERM) NÃO libera a memória compartilhada do Postgres — a rodada
// seguinte falharia com "pre-existing shared memory block is still in use". O `pg_ctl stop
// -m immediate` faz o desligamento correto, encerrando o postmaster e todos os processos filhos.
function encerrarInstanciaAnterior() {
  if (!existsSync(path.join(DIR_DADOS, "postmaster.pid"))) return;
  try {
    execFileSync(PG_CTL, ["stop", "-m", "immediate", "-w", "-D", DIR_DADOS], {
      stdio: "ignore",
      timeout: 15000,
    });
  } catch {
    // não estava rodando (ou já parou) — o rmSync a seguir limpa o resto.
  }
}

export default async function configurarBancoDeTeste() {
  config({ path: ".env.test", override: true });

  // Instância nova a cada execução: encerra a anterior e remove seus dados.
  encerrarInstanciaAnterior();
  rmSync(DIR_DADOS, { recursive: true, force: true });

  const pg = new EmbeddedPostgres({
    databaseDir: DIR_DADOS,
    user: USUARIO,
    password: SENHA,
    port: PORTA,
    persistent: false,
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase(BANCO);

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: URL_LOCAL },
    stdio: "inherit",
  });

  // Teardown: derruba o Postgres local ao fim da suíte.
  return async () => {
    await pg.stop();
  };
}
