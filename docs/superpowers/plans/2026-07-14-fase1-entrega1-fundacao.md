# Fase 1 — Entrega 1: Fundação — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Colocar de pé a fundação do sistema: projeto Next.js + PostgreSQL configurado, autenticação com sessões próprias, seis perfis de acesso, gestão de usuários e trilha de auditoria — tudo testado.

**Architecture:** Monolito modular Next.js (App Router) + TypeScript com PostgreSQL via Prisma. Autenticação própria: senha com bcrypt, sessões opacas em banco (token aleatório, armazenado como hash SHA-256) em cookie httpOnly. Regras de negócio vivem em `src/lib/` como funções testáveis; server actions e páginas são camada fina por cima.

**Tech Stack:** Next.js 15 (App Router), TypeScript, PostgreSQL 16 (Docker), Prisma, bcryptjs, Vitest, Tailwind CSS.

**Escopo:** Este plano cobre APENAS a Entrega 1 do spec ([spec](../specs/2026-07-14-fase1-fundacao-pacientes-prontuario-design.md), seção 5). Entregas 2–5 (pacientes, dados clínicos, evoluções, documentos) terão planos próprios. Deploy em nuvem e rotina de backup ficam para um plano de operação antes do primeiro uso real — em desenvolvimento tudo roda local.

**Idioma do código:** identificadores de domínio em português (`Usuario`, `criarSessao`), termos técnicos em inglês quando padrão do ecossistema.

---

## Estrutura de arquivos ao final da entrega

```
prisma/schema.prisma            # Usuario, Sessao, EventoAuditoria, enum Perfil
prisma/seed.ts                  # cria o primeiro administrador
vitest.config.ts
.env / .env.test / .env.exemplo
src/
  middleware.ts                 # redireciona para /login se não há cookie
  lib/
    db.ts                       # singleton do PrismaClient
    perfis.ts                   # rótulos e helper perfilPermitido
    auditoria.ts                # registrarEvento
    auth/
      senha.ts                  # gerarHashSenha / verificarSenha
      sessao.ts                 # criarSessao / validarSessao / invalidarSessao
      autenticar.ts             # autenticar(email, senha) — lógica testável do login
      cookie.ts                 # nome e opções do cookie de sessão
      acoes.ts                  # server actions: entrar / sair
      contexto.ts               # obterUsuarioAtual / exigirUsuario / exigirPerfil
    usuarios/
      servico.ts                # criarUsuario / definirAtivo / redefinirSenha
  app/
    login/page.tsx + formulario.tsx
    sem-permissao/page.tsx
    (app)/layout.tsx            # shell autenticado (header, sair)
    (app)/page.tsx              # painel inicial
    (app)/usuarios/page.tsx + novo/page.tsx + acoes.ts + formulario-novo.tsx
    (app)/auditoria/page.tsx    # consulta da trilha (admin)
tests/
  ajuda.ts                      # criarUsuarioTeste / limparBanco
  setup-global.ts               # aplica migrações no banco de teste
  setup.ts                      # carrega .env.test
  infra.test.ts / senha.test.ts / sessao.test.ts / auditoria.test.ts /
  autenticar.test.ts / perfis.test.ts / usuarios-servico.test.ts
```

**Banco de dados (decisão de execução):** O PostgreSQL é hospedado no **Railway** (nuvem), não em Docker local. A instância roda PostgreSQL 18.4. Usamos dois bancos na mesma instância: `railway` (desenvolvimento, padrão do Railway) e `nefrosys_teste` (testes, criado à parte). A connection string pública (`DATABASE_PUBLIC_URL`) fica só no `.env`/`.env.test` locais, nunca versionada. Requisito da máquina: Node.js 20+.

---

### Task 1: Scaffold do projeto Next.js

**Files:**
- Create: projeto Next.js na raiz do repositório (via create-next-app)

- [ ] **Step 1: Gerar o projeto em pasta temporária e mover para a raiz**

O diretório já contém `docs/` e `.git`, então o scaffold é feito em subpasta e movido:

```bash
npx --yes create-next-app@latest nefrosys-tmp --typescript --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm --yes
shopt -s dotglob
mv nefrosys-tmp/* .
rmdir nefrosys-tmp
```

Esperado: `package.json`, `src/app/`, `tsconfig.json`, `.gitignore` na raiz. (create-next-app não roda `git init` porque já estamos dentro de um repositório.)

- [ ] **Step 2: Verificar que o projeto compila**

Run: `npm run build`
Esperado: build conclui sem erros ("Compiled successfully").

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + TypeScript + Tailwind"
```

---

### Task 2: PostgreSQL local, Prisma e Vitest

**Files:**
- Create: `.env`, `.env.test`, `.env.exemplo`, `src/lib/db.ts`, `vitest.config.ts`, `tests/setup.ts`, `tests/setup-global.ts`, `tests/infra.test.ts`
- Modify: `package.json` (script `test`), `.gitignore`, `prisma/schema.prisma` (gerado pelo init)

- [ ] **Step 1: Banco no Railway (já provisionado)**

O PostgreSQL é hospedado no Railway. A instância e o banco de testes `nefrosys_teste` já foram
criados na execução. A connection string pública tem o formato:

```
postgresql://postgres:<senha>@<host>.proxy.rlwy.net:<porta>/railway
```

O banco de desenvolvimento é o `railway` (padrão); o de testes é o mesmo host com `/nefrosys_teste`.

- [ ] **Step 2: Instalar e inicializar o Prisma**

```bash
npm install prisma @prisma/client
npx prisma init --datasource-provider postgresql
```

Criar os arquivos de ambiente (o `.gitignore` do create-next-app já ignora `.env*`; o `.env.exemplo`
é versionado). Substituir `<senha>`, `<host>` e `<porta>` pelos valores reais do Railway:

```bash
# .env
DATABASE_URL="postgresql://postgres:<senha>@<host>.proxy.rlwy.net:<porta>/railway"
```

```bash
# .env.test
DATABASE_URL="postgresql://postgres:<senha>@<host>.proxy.rlwy.net:<porta>/nefrosys_teste"
```

```bash
# .env.exemplo — copie para .env e preencha com a DATABASE_PUBLIC_URL do Railway
DATABASE_URL="postgresql://postgres:SENHA@HOST.proxy.rlwy.net:PORTA/railway"
```

Adicionar `!.env.exemplo` ao final do `.gitignore` para versionar o exemplo.

- [ ] **Step 4: Criar o singleton do PrismaClient**

```ts
// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalParaPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalParaPrisma.prisma = db;
```

- [ ] **Step 5: Configurar o Vitest**

```bash
npm install -D vitest dotenv
```

```ts
// vitest.config.ts
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
```

```ts
// tests/setup.ts
import { config } from "dotenv";

config({ path: ".env.test", override: true });
```

```ts
// tests/setup-global.ts
import { execSync } from "node:child_process";
import { config } from "dotenv";

export default function configurarBancoDeTeste() {
  config({ path: ".env.test", override: true });
  execSync("npx prisma migrate deploy", { env: { ...process.env }, stdio: "inherit" });
}
```

Em `package.json`, adicionar em `"scripts"`: `"test": "vitest run"`.

- [ ] **Step 6: Teste de sanidade da conexão**

```ts
// tests/infra.test.ts
import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";

describe("infraestrutura", () => {
  it("conecta ao banco de teste", async () => {
    const resultado = await db.$queryRaw`SELECT 1 AS ok`;
    expect(resultado).toEqual([{ ok: 1 }]);
  });
});
```

Run: `npm test`
Esperado: 1 teste passando (o `migrate deploy` apenas avisa que não há migrações ainda).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: PostgreSQL via Docker, Prisma e Vitest configurados"
```

---

### Task 3: Esquema do banco — Usuario, Sessao, EventoAuditoria

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Escrever o esquema completo**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Perfil {
  ADMINISTRADOR
  MEDICO
  ENFERMAGEM
  TECNICO
  RECEPCAO
  MULTIPROFISSIONAL
}

model Usuario {
  id           String   @id @default(cuid())
  nome         String
  email        String   @unique
  senhaHash    String
  perfil       Perfil
  ativo        Boolean  @default(true)
  criadoEm     DateTime @default(now())
  atualizadoEm DateTime @updatedAt

  sessoes Sessao[]
  eventos EventoAuditoria[]
}

model Sessao {
  id        String   @id // hash SHA-256 do token — o token em si nunca é armazenado
  usuarioId String
  expiraEm  DateTime
  criadaEm  DateTime @default(now())

  usuario Usuario @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  @@index([usuarioId])
}

model EventoAuditoria {
  id         String   @id @default(cuid())
  usuarioId  String?
  acao       String // ex.: "login.sucesso", "usuario.criar"
  entidade   String? // ex.: "Usuario"
  entidadeId String?
  detalhes   Json?
  criadoEm   DateTime @default(now())

  usuario Usuario? @relation(fields: [usuarioId], references: [id], onDelete: SetNull)

  @@index([criadoEm])
  @@index([usuarioId])
}
```

- [ ] **Step 2: Gerar e aplicar a migração**

Run: `npx prisma migrate dev --name fundacao`
Esperado: migração criada em `prisma/migrations/` e aplicada; client gerado.

- [ ] **Step 3: Rodar os testes (o banco de teste recebe a migração no globalSetup)**

Run: `npm test`
Esperado: teste de infraestrutura segue passando; log mostra a migração `fundacao` aplicada no `nefrosys_teste`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: esquema de usuarios, sessoes e auditoria"
```

---

### Task 4: Módulo de senha (TDD)

**Files:**
- Create: `src/lib/auth/senha.ts`
- Test: `tests/senha.test.ts`

- [ ] **Step 1: Instalar bcryptjs**

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

- [ ] **Step 2: Escrever os testes (devem falhar)**

```ts
// tests/senha.test.ts
import { describe, it, expect } from "vitest";
import { gerarHashSenha, verificarSenha } from "@/lib/auth/senha";

describe("senha", () => {
  it("gera hash bcrypt diferente da senha original", async () => {
    const hash = await gerarHashSenha("SenhaForte123");
    expect(hash).not.toBe("SenhaForte123");
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("aceita a senha correta", async () => {
    const hash = await gerarHashSenha("SenhaForte123");
    expect(await verificarSenha("SenhaForte123", hash)).toBe(true);
  });

  it("rejeita senha incorreta", async () => {
    const hash = await gerarHashSenha("SenhaForte123");
    expect(await verificarSenha("outraSenha", hash)).toBe(false);
  });
});
```

- [ ] **Step 3: Verificar que falham**

Run: `npm test -- senha`
Esperado: FAIL — módulo `@/lib/auth/senha` não existe.

- [ ] **Step 4: Implementar**

```ts
// src/lib/auth/senha.ts
import bcrypt from "bcryptjs";

const CUSTO_BCRYPT = 12;

export async function gerarHashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, CUSTO_BCRYPT);
}

export async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}
```

- [ ] **Step 5: Verificar que passam**

Run: `npm test -- senha`
Esperado: 3 testes passando.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: hash e verificacao de senha com bcrypt"
```

---

### Task 5: Módulo de sessão (TDD)

**Files:**
- Create: `src/lib/auth/sessao.ts`, `tests/ajuda.ts`
- Test: `tests/sessao.test.ts`

- [ ] **Step 1: Criar helpers de teste**

```ts
// tests/ajuda.ts
import { db } from "@/lib/db";
import { gerarHashSenha } from "@/lib/auth/senha";
import type { Perfil } from "@prisma/client";

export async function limparBanco() {
  await db.sessao.deleteMany();
  await db.eventoAuditoria.deleteMany();
  await db.usuario.deleteMany();
}

export async function criarUsuarioTeste(dados?: {
  email?: string;
  senha?: string;
  perfil?: Perfil;
  ativo?: boolean;
}) {
  return db.usuario.create({
    data: {
      nome: "Usuário Teste",
      email: dados?.email ?? "teste@clinica.local",
      senhaHash: await gerarHashSenha(dados?.senha ?? "SenhaForte123"),
      perfil: dados?.perfil ?? "MEDICO",
      ativo: dados?.ativo ?? true,
    },
  });
}
```

- [ ] **Step 2: Escrever os testes (devem falhar)**

```ts
// tests/sessao.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { criarSessao, validarSessao, invalidarSessao } from "@/lib/auth/sessao";
import { criarUsuarioTeste, limparBanco } from "./ajuda";
import { db } from "@/lib/db";

describe("sessao", () => {
  beforeEach(limparBanco);

  it("cria sessão e valida o token retornando o usuário", async () => {
    const usuario = await criarUsuarioTeste();
    const token = await criarSessao(usuario.id);
    const validado = await validarSessao(token);
    expect(validado?.id).toBe(usuario.id);
  });

  it("não armazena o token em texto puro", async () => {
    const usuario = await criarUsuarioTeste();
    const token = await criarSessao(usuario.id);
    const sessoes = await db.sessao.findMany();
    expect(sessoes).toHaveLength(1);
    expect(sessoes[0].id).not.toBe(token);
  });

  it("rejeita token inexistente", async () => {
    expect(await validarSessao("token-que-nao-existe")).toBeNull();
  });

  it("rejeita sessão expirada e a remove do banco", async () => {
    const usuario = await criarUsuarioTeste();
    const token = await criarSessao(usuario.id);
    await db.sessao.updateMany({ data: { expiraEm: new Date(Date.now() - 1000) } });
    expect(await validarSessao(token)).toBeNull();
    expect(await db.sessao.count()).toBe(0);
  });

  it("rejeita sessão de usuário desativado", async () => {
    const usuario = await criarUsuarioTeste({ ativo: false });
    const token = await criarSessao(usuario.id);
    expect(await validarSessao(token)).toBeNull();
  });

  it("invalida a sessão no logout", async () => {
    const usuario = await criarUsuarioTeste();
    const token = await criarSessao(usuario.id);
    await invalidarSessao(token);
    expect(await validarSessao(token)).toBeNull();
  });
});
```

- [ ] **Step 3: Verificar que falham**

Run: `npm test -- sessao`
Esperado: FAIL — módulo `@/lib/auth/sessao` não existe.

- [ ] **Step 4: Implementar**

```ts
// src/lib/auth/sessao.ts
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type { Usuario } from "@prisma/client";

const DURACAO_SESSAO_MS = 12 * 60 * 60 * 1000; // expira por inatividade em até 12h

function hashDoToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function criarSessao(usuarioId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.sessao.create({
    data: {
      id: hashDoToken(token),
      usuarioId,
      expiraEm: new Date(Date.now() + DURACAO_SESSAO_MS),
    },
  });
  return token;
}

export async function validarSessao(token: string): Promise<Usuario | null> {
  const sessao = await db.sessao.findUnique({
    where: { id: hashDoToken(token) },
    include: { usuario: true },
  });
  if (!sessao) return null;
  if (sessao.expiraEm < new Date()) {
    await db.sessao.delete({ where: { id: sessao.id } });
    return null;
  }
  if (!sessao.usuario.ativo) return null;
  // renovação deslizante: estende quando passou da metade da validade
  if (sessao.expiraEm.getTime() - Date.now() < DURACAO_SESSAO_MS / 2) {
    await db.sessao.update({
      where: { id: sessao.id },
      data: { expiraEm: new Date(Date.now() + DURACAO_SESSAO_MS) },
    });
  }
  return sessao.usuario;
}

export async function invalidarSessao(token: string): Promise<void> {
  await db.sessao.deleteMany({ where: { id: hashDoToken(token) } });
}
```

- [ ] **Step 5: Verificar que passam**

Run: `npm test -- sessao`
Esperado: 6 testes passando.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: sessoes em banco com token opaco e expiracao"
```

---

### Task 6: Trilha de auditoria (TDD)

**Files:**
- Create: `src/lib/auditoria.ts`
- Test: `tests/auditoria.test.ts`

- [ ] **Step 1: Escrever os testes (devem falhar)**

```ts
// tests/auditoria.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { registrarEvento } from "@/lib/auditoria";
import { criarUsuarioTeste, limparBanco } from "./ajuda";
import { db } from "@/lib/db";

describe("auditoria", () => {
  beforeEach(limparBanco);

  it("registra evento com autor, ação, entidade e detalhes", async () => {
    const usuario = await criarUsuarioTeste();
    await registrarEvento({
      usuarioId: usuario.id,
      acao: "usuario.criar",
      entidade: "Usuario",
      entidadeId: "abc123",
      detalhes: { perfil: "MEDICO" },
    });
    const eventos = await db.eventoAuditoria.findMany();
    expect(eventos).toHaveLength(1);
    expect(eventos[0].acao).toBe("usuario.criar");
    expect(eventos[0].usuarioId).toBe(usuario.id);
    expect(eventos[0].entidadeId).toBe("abc123");
  });

  it("aceita evento sem usuário (ex.: tentativa de login com e-mail desconhecido)", async () => {
    await registrarEvento({ usuarioId: null, acao: "login.falha", detalhes: { email: "x@y.z" } });
    const eventos = await db.eventoAuditoria.findMany();
    expect(eventos).toHaveLength(1);
    expect(eventos[0].usuarioId).toBeNull();
  });
});
```

- [ ] **Step 2: Verificar que falham**

Run: `npm test -- auditoria`
Esperado: FAIL — módulo `@/lib/auditoria` não existe.

- [ ] **Step 3: Implementar**

```ts
// src/lib/auditoria.ts
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

// A trilha é somente-acréscimo: este módulo não expõe atualização nem exclusão.
export async function registrarEvento(dados: {
  usuarioId: string | null;
  acao: string;
  entidade?: string;
  entidadeId?: string;
  detalhes?: Prisma.InputJsonValue;
}): Promise<void> {
  await db.eventoAuditoria.create({
    data: {
      usuarioId: dados.usuarioId,
      acao: dados.acao,
      entidade: dados.entidade,
      entidadeId: dados.entidadeId,
      detalhes: dados.detalhes,
    },
  });
}
```

- [ ] **Step 4: Verificar que passam**

Run: `npm test -- auditoria`
Esperado: 2 testes passando.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: trilha de auditoria somente-acrescimo"
```

---

### Task 7: Autenticação — lógica de login (TDD)

**Files:**
- Create: `src/lib/auth/autenticar.ts`
- Test: `tests/autenticar.test.ts`

- [ ] **Step 1: Escrever os testes (devem falhar)**

```ts
// tests/autenticar.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { autenticar } from "@/lib/auth/autenticar";
import { criarUsuarioTeste, limparBanco } from "./ajuda";
import { db } from "@/lib/db";

describe("autenticar", () => {
  beforeEach(limparBanco);

  it("retorna o usuário com credenciais válidas e audita o sucesso", async () => {
    const usuario = await criarUsuarioTeste({ email: "medico@clinica.local", senha: "SenhaForte123" });
    const resultado = await autenticar("medico@clinica.local", "SenhaForte123");
    expect(resultado?.id).toBe(usuario.id);
    const eventos = await db.eventoAuditoria.findMany({ where: { acao: "login.sucesso" } });
    expect(eventos).toHaveLength(1);
  });

  it("normaliza o e-mail (maiúsculas e espaços)", async () => {
    await criarUsuarioTeste({ email: "medico@clinica.local" });
    const resultado = await autenticar("  MEDICO@clinica.local ", "SenhaForte123");
    expect(resultado).not.toBeNull();
  });

  it("rejeita senha errada e audita a falha", async () => {
    await criarUsuarioTeste({ email: "medico@clinica.local" });
    const resultado = await autenticar("medico@clinica.local", "senhaErrada");
    expect(resultado).toBeNull();
    const eventos = await db.eventoAuditoria.findMany({ where: { acao: "login.falha" } });
    expect(eventos).toHaveLength(1);
  });

  it("rejeita e-mail desconhecido e audita a falha", async () => {
    expect(await autenticar("ninguem@clinica.local", "qualquer")).toBeNull();
    const eventos = await db.eventoAuditoria.findMany({ where: { acao: "login.falha" } });
    expect(eventos).toHaveLength(1);
  });

  it("rejeita usuário desativado", async () => {
    await criarUsuarioTeste({ email: "ex@clinica.local", ativo: false });
    expect(await autenticar("ex@clinica.local", "SenhaForte123")).toBeNull();
  });
});
```

- [ ] **Step 2: Verificar que falham**

Run: `npm test -- autenticar`
Esperado: FAIL — módulo `@/lib/auth/autenticar` não existe.

- [ ] **Step 3: Implementar**

```ts
// src/lib/auth/autenticar.ts
import { db } from "@/lib/db";
import { verificarSenha } from "./senha";
import { registrarEvento } from "@/lib/auditoria";
import type { Usuario } from "@prisma/client";

export async function autenticar(email: string, senha: string): Promise<Usuario | null> {
  const emailNormalizado = email.trim().toLowerCase();
  const usuario = await db.usuario.findUnique({ where: { email: emailNormalizado } });
  // verifica a senha mesmo sem usuário para não vazar, pelo tempo de resposta, se o e-mail existe
  const senhaConfere = usuario ? await verificarSenha(senha, usuario.senhaHash) : false;
  if (!usuario || !usuario.ativo || !senhaConfere) {
    await registrarEvento({
      usuarioId: usuario?.id ?? null,
      acao: "login.falha",
      detalhes: { email: emailNormalizado },
    });
    return null;
  }
  await registrarEvento({ usuarioId: usuario.id, acao: "login.sucesso" });
  return usuario;
}
```

- [ ] **Step 4: Verificar que passam**

Run: `npm test -- autenticar`
Esperado: 5 testes passando.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: logica de autenticacao com auditoria de login"
```

---

### Task 8: Perfis, cookie, server actions e proteção de rotas

**Files:**
- Create: `src/lib/perfis.ts`, `src/lib/auth/cookie.ts`, `src/lib/auth/acoes.ts`, `src/lib/auth/contexto.ts`, `src/middleware.ts`
- Test: `tests/perfis.test.ts`

- [ ] **Step 1: Teste do helper de permissão (deve falhar)**

```ts
// tests/perfis.test.ts
import { describe, it, expect } from "vitest";
import { perfilPermitido, rotuloPerfil } from "@/lib/perfis";

describe("perfis", () => {
  it("autoriza perfil presente na lista", () => {
    expect(perfilPermitido("MEDICO", ["MEDICO", "ENFERMAGEM"])).toBe(true);
  });

  it("nega perfil ausente da lista", () => {
    expect(perfilPermitido("RECEPCAO", ["MEDICO", "ENFERMAGEM"])).toBe(false);
  });

  it("tem rótulo em português para todos os perfis", () => {
    const perfis = ["ADMINISTRADOR", "MEDICO", "ENFERMAGEM", "TECNICO", "RECEPCAO", "MULTIPROFISSIONAL"] as const;
    for (const perfil of perfis) expect(rotuloPerfil[perfil]).toBeTruthy();
  });
});
```

Run: `npm test -- perfis` — Esperado: FAIL.

- [ ] **Step 2: Implementar perfis.ts e verificar que passa**

```ts
// src/lib/perfis.ts
import type { Perfil } from "@prisma/client";

export const rotuloPerfil: Record<Perfil, string> = {
  ADMINISTRADOR: "Administrador",
  MEDICO: "Médico",
  ENFERMAGEM: "Enfermagem",
  TECNICO: "Técnico",
  RECEPCAO: "Recepção",
  MULTIPROFISSIONAL: "Multiprofissional",
};

export function perfilPermitido(perfil: Perfil, permitidos: readonly Perfil[]): boolean {
  return permitidos.includes(perfil);
}
```

Run: `npm test -- perfis` — Esperado: 3 testes passando.

- [ ] **Step 3: Cookie de sessão**

```ts
// src/lib/auth/cookie.ts
export const COOKIE_SESSAO = "nefrosys_sessao";

export const opcoesCookieSessao = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 12 * 60 * 60, // acompanha a duração da sessão no banco
} as const;
```

- [ ] **Step 4: Server actions de entrar/sair**

```ts
// src/lib/auth/acoes.ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { autenticar } from "./autenticar";
import { criarSessao, invalidarSessao } from "./sessao";
import { COOKIE_SESSAO, opcoesCookieSessao } from "./cookie";

export type EstadoLogin = { erro: string } | undefined;

export async function entrar(_anterior: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");
  if (!email.trim() || !senha) return { erro: "Informe e-mail e senha." };

  const usuario = await autenticar(email, senha);
  if (!usuario) return { erro: "E-mail ou senha inválidos." };

  const token = await criarSessao(usuario.id);
  (await cookies()).set(COOKIE_SESSAO, token, opcoesCookieSessao);
  redirect("/");
}

export async function sair(): Promise<void> {
  const armazem = await cookies();
  const token = armazem.get(COOKIE_SESSAO)?.value;
  if (token) await invalidarSessao(token);
  armazem.delete(COOKIE_SESSAO);
  redirect("/login");
}
```

- [ ] **Step 5: Contexto do usuário para páginas e actions**

```ts
// src/lib/auth/contexto.ts
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validarSessao } from "./sessao";
import { COOKIE_SESSAO } from "./cookie";
import { perfilPermitido } from "@/lib/perfis";
import type { Perfil, Usuario } from "@prisma/client";

export const obterUsuarioAtual = cache(async (): Promise<Usuario | null> => {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token) return null;
  return validarSessao(token);
});

export async function exigirUsuario(): Promise<Usuario> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/login");
  return usuario;
}

export async function exigirPerfil(...perfis: Perfil[]): Promise<Usuario> {
  const usuario = await exigirUsuario();
  if (!perfilPermitido(usuario.perfil, perfis)) redirect("/sem-permissao");
  return usuario;
}
```

- [ ] **Step 6: Middleware (defesa em camada — a validação real é `exigirUsuario` no servidor)**

```ts
// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO } from "@/lib/auth/cookie";

const ROTAS_PUBLICAS = ["/login"];

export function middleware(pedido: NextRequest) {
  const publica = ROTAS_PUBLICAS.some((rota) => pedido.nextUrl.pathname.startsWith(rota));
  if (!publica && !pedido.cookies.has(COOKIE_SESSAO)) {
    return NextResponse.redirect(new URL("/login", pedido.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon\\.ico).*)"],
};
```

- [ ] **Step 7: Verificação geral**

Run: `npm test && npm run build`
Esperado: todos os testes passando; build sem erros.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: perfis, cookie de sessao, actions de login/logout e protecao de rotas"
```

---

### Task 9: Seed do administrador, tela de login e shell autenticado

**Files:**
- Create: `prisma/seed.ts`, `src/app/login/page.tsx`, `src/app/login/formulario.tsx`, `src/app/sem-permissao/page.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx`
- Modify: `package.json` (bloco `prisma.seed`)
- Delete: `src/app/page.tsx` (página padrão do scaffold)

- [ ] **Step 1: Seed do primeiro administrador**

```bash
npm install -D tsx
```

```ts
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@clinica.local";
  const senha = process.env.SEED_ADMIN_SENHA ?? "TroqueEstaSenha!123";
  const existente = await db.usuario.findUnique({ where: { email } });
  if (existente) {
    console.log(`Administrador já existe: ${email}`);
    return;
  }
  await db.usuario.create({
    data: {
      nome: "Administrador",
      email,
      senhaHash: await bcrypt.hash(senha, 12),
      perfil: "ADMINISTRADOR",
    },
  });
  console.log(`Administrador criado: ${email} (troque a senha no primeiro acesso)`);
}

main().finally(() => db.$disconnect());
```

Em `package.json`, adicionar no nível raiz:

```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```

Run: `npx prisma db seed`
Esperado: "Administrador criado: admin@clinica.local".

- [ ] **Step 2: Página e formulário de login**

Remover a página padrão do scaffold: `rm src/app/page.tsx`

```tsx
// src/app/login/page.tsx
import { FormularioLogin } from "./formulario";

export default function PaginaLogin() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
        <h1 className="mb-1 text-center text-2xl font-semibold text-slate-800">Nefrosys</h1>
        <p className="mb-6 text-center text-sm text-slate-500">Gestão de clínica de nefrologia</p>
        <FormularioLogin />
      </div>
    </main>
  );
}
```

```tsx
// src/app/login/formulario.tsx
"use client";

import { useActionState } from "react";
import { entrar } from "@/lib/auth/acoes";

export function FormularioLogin() {
  const [estado, acao, pendente] = useActionState(entrar, undefined);
  return (
    <form action={acao} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label htmlFor="senha" className="block text-sm font-medium text-slate-700">Senha</label>
        <input id="senha" name="senha" type="password" autoComplete="current-password" required
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
      </div>
      {estado?.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <button type="submit" disabled={pendente}
        className="w-full rounded bg-blue-700 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50">
        {pendente ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Shell autenticado e páginas básicas**

```tsx
// src/app/(app)/layout.tsx
import { exigirUsuario } from "@/lib/auth/contexto";
import { sair } from "@/lib/auth/acoes";
import { rotuloPerfil } from "@/lib/perfis";
import Link from "next/link";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();
  const ehAdmin = usuario.perfil === "ADMINISTRADOR";
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-3">
        <nav className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-slate-800">Nefrosys</Link>
          {ehAdmin && <Link href="/usuarios" className="text-sm text-slate-600 hover:underline">Usuários</Link>}
          {ehAdmin && <Link href="/auditoria" className="text-sm text-slate-600 hover:underline">Auditoria</Link>}
        </nav>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span>{usuario.nome} — {rotuloPerfil[usuario.perfil]}</span>
          <form action={sair}>
            <button className="text-red-600 hover:underline">Sair</button>
          </form>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
```

```tsx
// src/app/(app)/page.tsx
import { exigirUsuario } from "@/lib/auth/contexto";

export default async function PaginaInicial() {
  const usuario = await exigirUsuario();
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800">Bem-vindo(a), {usuario.nome}</h1>
      <p className="mt-2 text-slate-600">Os módulos de pacientes e prontuário chegam nas próximas entregas.</p>
    </div>
  );
}
```

```tsx
// src/app/sem-permissao/page.tsx
import Link from "next/link";

export default function PaginaSemPermissao() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-xl font-semibold text-slate-800">Acesso negado</h1>
      <p className="text-slate-600">Seu perfil não tem permissão para acessar esta área.</p>
      <Link href="/" className="text-blue-700 hover:underline">Voltar ao início</Link>
    </main>
  );
}
```

- [ ] **Step 4: Verificar build e fluxo manual**

Run: `npm test && npm run build`
Esperado: testes e build passando.

Run: `npm run dev` e verificar no navegador:
1. `http://localhost:3000` sem login → redireciona para `/login`.
2. Login com `admin@clinica.local` / `TroqueEstaSenha!123` → painel inicial com nome e perfil.
3. Botão "Sair" → volta ao login e `/` volta a redirecionar.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: seed do admin, tela de login e shell autenticado"
```

---

### Task 10: Serviço de gestão de usuários (TDD)

**Files:**
- Create: `src/lib/usuarios/servico.ts`
- Test: `tests/usuarios-servico.test.ts`

- [ ] **Step 1: Escrever os testes (devem falhar)**

```ts
// tests/usuarios-servico.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { criarUsuario, definirAtivo, redefinirSenha } from "@/lib/usuarios/servico";
import { criarUsuarioTeste, limparBanco } from "./ajuda";
import { criarSessao, validarSessao } from "@/lib/auth/sessao";
import { verificarSenha } from "@/lib/auth/senha";
import { db } from "@/lib/db";

describe("servico de usuarios", () => {
  beforeEach(limparBanco);

  it("cria usuário com senha em hash e audita", async () => {
    const admin = await criarUsuarioTeste({ perfil: "ADMINISTRADOR", email: "admin@clinica.local" });
    const resultado = await criarUsuario(
      { nome: "Dra. Ana", email: "Ana@Clinica.Local", senha: "SenhaForte123", perfil: "MEDICO" },
      admin.id,
    );
    expect(resultado.ok).toBe(true);
    const criado = await db.usuario.findUnique({ where: { email: "ana@clinica.local" } });
    expect(criado).not.toBeNull();
    expect(criado!.senhaHash).not.toBe("SenhaForte123");
    const eventos = await db.eventoAuditoria.findMany({ where: { acao: "usuario.criar" } });
    expect(eventos).toHaveLength(1);
  });

  it("rejeita e-mail duplicado", async () => {
    const admin = await criarUsuarioTeste({ perfil: "ADMINISTRADOR", email: "admin@clinica.local" });
    await criarUsuario({ nome: "A", email: "dup@clinica.local", senha: "SenhaForte123", perfil: "MEDICO" }, admin.id);
    const resultado = await criarUsuario(
      { nome: "B", email: "dup@clinica.local", senha: "SenhaForte123", perfil: "ENFERMAGEM" },
      admin.id,
    );
    expect(resultado).toEqual({ ok: false, erro: "Já existe usuário com este e-mail." });
  });

  it("rejeita senha curta e nome vazio", async () => {
    const admin = await criarUsuarioTeste({ perfil: "ADMINISTRADOR", email: "admin@clinica.local" });
    expect(
      await criarUsuario({ nome: "A", email: "a@clinica.local", senha: "curta", perfil: "MEDICO" }, admin.id),
    ).toEqual({ ok: false, erro: "A senha deve ter ao menos 10 caracteres." });
    expect(
      await criarUsuario({ nome: "  ", email: "b@clinica.local", senha: "SenhaForte123", perfil: "MEDICO" }, admin.id),
    ).toEqual({ ok: false, erro: "Informe o nome." });
  });

  it("desativar usuário derruba as sessões dele", async () => {
    const admin = await criarUsuarioTeste({ perfil: "ADMINISTRADOR", email: "admin@clinica.local" });
    const alvo = await criarUsuarioTeste({ email: "alvo@clinica.local" });
    const token = await criarSessao(alvo.id);
    const resultado = await definirAtivo(alvo.id, false, admin.id);
    expect(resultado.ok).toBe(true);
    expect(await validarSessao(token)).toBeNull();
  });

  it("impede o administrador de desativar a si mesmo", async () => {
    const admin = await criarUsuarioTeste({ perfil: "ADMINISTRADOR", email: "admin@clinica.local" });
    const resultado = await definirAtivo(admin.id, false, admin.id);
    expect(resultado).toEqual({ ok: false, erro: "Você não pode desativar o próprio usuário." });
  });

  it("redefine senha e audita sem registrar a senha nos detalhes", async () => {
    const admin = await criarUsuarioTeste({ perfil: "ADMINISTRADOR", email: "admin@clinica.local" });
    const alvo = await criarUsuarioTeste({ email: "alvo@clinica.local" });
    const resultado = await redefinirSenha(alvo.id, "NovaSenhaForte1", admin.id);
    expect(resultado.ok).toBe(true);
    const atualizado = await db.usuario.findUnique({ where: { id: alvo.id } });
    expect(await verificarSenha("NovaSenhaForte1", atualizado!.senhaHash)).toBe(true);
    const eventos = await db.eventoAuditoria.findMany({ where: { acao: "usuario.redefinir_senha" } });
    expect(eventos).toHaveLength(1);
    expect(JSON.stringify(eventos[0].detalhes ?? {})).not.toContain("NovaSenhaForte1");
  });
});
```

- [ ] **Step 2: Verificar que falham**

Run: `npm test -- usuarios-servico`
Esperado: FAIL — módulo `@/lib/usuarios/servico` não existe.

- [ ] **Step 3: Implementar**

```ts
// src/lib/usuarios/servico.ts
import { db } from "@/lib/db";
import { gerarHashSenha } from "@/lib/auth/senha";
import { registrarEvento } from "@/lib/auditoria";
import type { Perfil } from "@prisma/client";

export type ResultadoUsuario = { ok: true; id: string } | { ok: false; erro: string };

const TAMANHO_MINIMO_SENHA = 10;

export async function criarUsuario(
  dados: { nome: string; email: string; senha: string; perfil: Perfil },
  autorId: string,
): Promise<ResultadoUsuario> {
  const nome = dados.nome.trim();
  const email = dados.email.trim().toLowerCase();
  if (!nome) return { ok: false, erro: "Informe o nome." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, erro: "E-mail inválido." };
  if (dados.senha.length < TAMANHO_MINIMO_SENHA)
    return { ok: false, erro: `A senha deve ter ao menos ${TAMANHO_MINIMO_SENHA} caracteres.` };
  if (await db.usuario.findUnique({ where: { email } }))
    return { ok: false, erro: "Já existe usuário com este e-mail." };

  const usuario = await db.usuario.create({
    data: { nome, email, senhaHash: await gerarHashSenha(dados.senha), perfil: dados.perfil },
  });
  await registrarEvento({
    usuarioId: autorId,
    acao: "usuario.criar",
    entidade: "Usuario",
    entidadeId: usuario.id,
    detalhes: { perfil: dados.perfil },
  });
  return { ok: true, id: usuario.id };
}

export async function definirAtivo(usuarioId: string, ativo: boolean, autorId: string): Promise<ResultadoUsuario> {
  if (usuarioId === autorId && !ativo)
    return { ok: false, erro: "Você não pode desativar o próprio usuário." };

  await db.usuario.update({ where: { id: usuarioId }, data: { ativo } });
  if (!ativo) await db.sessao.deleteMany({ where: { usuarioId } });
  await registrarEvento({
    usuarioId: autorId,
    acao: ativo ? "usuario.ativar" : "usuario.desativar",
    entidade: "Usuario",
    entidadeId: usuarioId,
  });
  return { ok: true, id: usuarioId };
}

export async function redefinirSenha(usuarioId: string, novaSenha: string, autorId: string): Promise<ResultadoUsuario> {
  if (novaSenha.length < TAMANHO_MINIMO_SENHA)
    return { ok: false, erro: `A senha deve ter ao menos ${TAMANHO_MINIMO_SENHA} caracteres.` };

  await db.usuario.update({ where: { id: usuarioId }, data: { senhaHash: await gerarHashSenha(novaSenha) } });
  await db.sessao.deleteMany({ where: { usuarioId } }); // sessões antigas caem junto
  await registrarEvento({
    usuarioId: autorId,
    acao: "usuario.redefinir_senha",
    entidade: "Usuario",
    entidadeId: usuarioId,
  });
  return { ok: true, id: usuarioId };
}
```

- [ ] **Step 4: Verificar que passam**

Run: `npm test -- usuarios-servico`
Esperado: 6 testes passando.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: servico de gestao de usuarios com auditoria"
```

---

### Task 11: Telas de gestão de usuários (admin)

**Files:**
- Create: `src/app/(app)/usuarios/page.tsx`, `src/app/(app)/usuarios/acoes.ts`, `src/app/(app)/usuarios/novo/page.tsx`, `src/app/(app)/usuarios/novo/formulario.tsx`

- [ ] **Step 1: Server actions da área de usuários**

```ts
// src/app/(app)/usuarios/acoes.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPerfil } from "@/lib/auth/contexto";
import { criarUsuario, definirAtivo } from "@/lib/usuarios/servico";
import type { Perfil } from "@prisma/client";

const PERFIS_VALIDOS: readonly Perfil[] = [
  "ADMINISTRADOR", "MEDICO", "ENFERMAGEM", "TECNICO", "RECEPCAO", "MULTIPROFISSIONAL",
];

export type EstadoFormularioUsuario = { erro: string } | undefined;

export async function acaoCriarUsuario(
  _anterior: EstadoFormularioUsuario,
  formData: FormData,
): Promise<EstadoFormularioUsuario> {
  const autor = await exigirPerfil("ADMINISTRADOR");
  const perfil = String(formData.get("perfil") ?? "");
  if (!PERFIS_VALIDOS.includes(perfil as Perfil)) return { erro: "Perfil inválido." };

  const resultado = await criarUsuario(
    {
      nome: String(formData.get("nome") ?? ""),
      email: String(formData.get("email") ?? ""),
      senha: String(formData.get("senha") ?? ""),
      perfil: perfil as Perfil,
    },
    autor.id,
  );
  if (!resultado.ok) return { erro: resultado.erro };
  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function acaoAlternarAtivo(formData: FormData): Promise<void> {
  const autor = await exigirPerfil("ADMINISTRADOR");
  await definirAtivo(String(formData.get("id") ?? ""), formData.get("ativo") === "true", autor.id);
  revalidatePath("/usuarios");
}
```

- [ ] **Step 2: Página de listagem**

```tsx
// src/app/(app)/usuarios/page.tsx
import Link from "next/link";
import { exigirPerfil } from "@/lib/auth/contexto";
import { db } from "@/lib/db";
import { rotuloPerfil } from "@/lib/perfis";
import { acaoAlternarAtivo } from "./acoes";

export default async function PaginaUsuarios() {
  const usuarioAtual = await exigirPerfil("ADMINISTRADOR");
  const usuarios = await db.usuario.findMany({ orderBy: { nome: "asc" } });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Usuários</h1>
        <Link href="/usuarios/novo" className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
          Novo usuário
        </Link>
      </div>
      <table className="w-full rounded bg-white shadow-sm">
        <thead>
          <tr className="border-b text-left text-sm text-slate-500">
            <th className="px-4 py-2">Nome</th>
            <th className="px-4 py-2">E-mail</th>
            <th className="px-4 py-2">Perfil</th>
            <th className="px-4 py-2">Situação</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {usuarios.map((usuario) => (
            <tr key={usuario.id} className="border-b text-sm">
              <td className="px-4 py-2">{usuario.nome}</td>
              <td className="px-4 py-2">{usuario.email}</td>
              <td className="px-4 py-2">{rotuloPerfil[usuario.perfil]}</td>
              <td className="px-4 py-2">{usuario.ativo ? "Ativo" : "Desativado"}</td>
              <td className="px-4 py-2 text-right">
                {usuario.id !== usuarioAtual.id && (
                  <form action={acaoAlternarAtivo}>
                    <input type="hidden" name="id" value={usuario.id} />
                    <input type="hidden" name="ativo" value={String(!usuario.ativo)} />
                    <button className={usuario.ativo ? "text-red-600 hover:underline" : "text-green-700 hover:underline"}>
                      {usuario.ativo ? "Desativar" : "Reativar"}
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Página e formulário de novo usuário**

```tsx
// src/app/(app)/usuarios/novo/page.tsx
import { exigirPerfil } from "@/lib/auth/contexto";
import { FormularioNovoUsuario } from "./formulario";

export default async function PaginaNovoUsuario() {
  await exigirPerfil("ADMINISTRADOR");
  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-xl font-semibold text-slate-800">Novo usuário</h1>
      <FormularioNovoUsuario />
    </div>
  );
}
```

```tsx
// src/app/(app)/usuarios/novo/formulario.tsx
"use client";

import { useActionState } from "react";
import { acaoCriarUsuario } from "../acoes";

const OPCOES_PERFIL = [
  ["ADMINISTRADOR", "Administrador"],
  ["MEDICO", "Médico"],
  ["ENFERMAGEM", "Enfermagem"],
  ["TECNICO", "Técnico"],
  ["RECEPCAO", "Recepção"],
  ["MULTIPROFISSIONAL", "Multiprofissional"],
] as const;

export function FormularioNovoUsuario() {
  const [estado, acao, pendente] = useActionState(acaoCriarUsuario, undefined);
  return (
    <form action={acao} className="space-y-4 rounded bg-white p-6 shadow-sm">
      <div>
        <label htmlFor="nome" className="block text-sm font-medium text-slate-700">Nome completo</label>
        <input id="nome" name="nome" required className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">E-mail</label>
        <input id="email" name="email" type="email" required className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label htmlFor="senha" className="block text-sm font-medium text-slate-700">Senha inicial (mín. 10 caracteres)</label>
        <input id="senha" name="senha" type="password" minLength={10} required className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label htmlFor="perfil" className="block text-sm font-medium text-slate-700">Perfil</label>
        <select id="perfil" name="perfil" required className="mt-1 w-full rounded border border-slate-300 px-3 py-2">
          {OPCOES_PERFIL.map(([valor, rotulo]) => (
            <option key={valor} value={valor}>{rotulo}</option>
          ))}
        </select>
      </div>
      {estado?.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <button type="submit" disabled={pendente}
        className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
        {pendente ? "Salvando..." : "Criar usuário"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Verificação**

Run: `npm test && npm run build`
Esperado: tudo passando.

Manual (`npm run dev`): logado como admin, criar um usuário MEDICO, desativá-lo, reativá-lo; logado como esse médico, acessar `/usuarios` → redireciona para `/sem-permissao`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: telas de gestao de usuarios para administrador"
```

---

### Task 12: Consulta da trilha de auditoria (admin)

**Files:**
- Create: `src/app/(app)/auditoria/page.tsx`

- [ ] **Step 1: Página de consulta (somente leitura, 200 eventos mais recentes)**

```tsx
// src/app/(app)/auditoria/page.tsx
import { exigirPerfil } from "@/lib/auth/contexto";
import { db } from "@/lib/db";

export default async function PaginaAuditoria() {
  await exigirPerfil("ADMINISTRADOR");
  const eventos = await db.eventoAuditoria.findMany({
    orderBy: { criadoEm: "desc" },
    take: 200,
    include: { usuario: { select: { nome: true, email: true } } },
  });

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-800">Trilha de auditoria</h1>
      <p className="mb-4 text-sm text-slate-500">Últimos 200 eventos. Registros de auditoria não podem ser editados nem excluídos.</p>
      <table className="w-full rounded bg-white text-sm shadow-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="px-4 py-2">Data/hora</th>
            <th className="px-4 py-2">Usuário</th>
            <th className="px-4 py-2">Ação</th>
            <th className="px-4 py-2">Entidade</th>
          </tr>
        </thead>
        <tbody>
          {eventos.map((evento) => (
            <tr key={evento.id} className="border-b align-top">
              <td className="whitespace-nowrap px-4 py-2">
                {evento.criadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
              </td>
              <td className="px-4 py-2">{evento.usuario ? evento.usuario.nome : "—"}</td>
              <td className="px-4 py-2 font-mono">{evento.acao}</td>
              <td className="px-4 py-2">{evento.entidade ? `${evento.entidade} ${evento.entidadeId ?? ""}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Verificação**

Run: `npm test && npm run build`
Esperado: tudo passando. Manual: como admin, `/auditoria` lista logins e ações de usuários; como não-admin, redireciona para `/sem-permissao`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: consulta da trilha de auditoria para administrador"
```

---

### Task 13: README e verificação final da entrega

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Reescrever o README com instruções de setup**

```markdown
# Nefrosys (novo)

Sistema de gestão para clínica de nefrologia/diálise. Fase 1 em construção —
veja `docs/superpowers/specs/` para o design e `docs/superpowers/plans/` para os planos.

## Requisitos

- Node.js 20+
- Docker Desktop (PostgreSQL 16)

## Primeira execução

```bash
docker compose up -d          # sobe o PostgreSQL (bancos nefrosys e nefrosys_teste)
cp .env.exemplo .env          # ajuste se necessário
npm install
npx prisma migrate dev        # aplica as migrações no banco de desenvolvimento
npx prisma db seed            # cria admin@clinica.local (senha: TroqueEstaSenha!123)
npm run dev                   # http://localhost:3000
```

## Testes

```bash
npm test                      # roda as migrações no banco de teste e executa o Vitest
```

## Convenções

- Regras de negócio em `src/lib/**` como funções testáveis; páginas e server actions são camada fina.
- Toda ação clínica ou administrativa relevante gera evento em `EventoAuditoria` (somente-acréscimo).
- Identificadores de domínio em português.
```

- [ ] **Step 2: Verificação final completa**

Run: `npm run lint && npm test && npm run build`
Esperado: lint sem erros, todos os testes passando, build ok.

Checklist manual final (com `npm run dev`):

1. Sem login, qualquer rota redireciona para `/login`.
2. Login errado mostra "E-mail ou senha inválidos" e gera evento `login.falha` na auditoria.
3. Login como admin funciona; header mostra nome e perfil; menus Usuários/Auditoria visíveis.
4. Criar usuário de cada perfil funciona; e-mail duplicado e senha curta mostram erro claro.
5. Usuário não-admin logado não vê os menus de admin e é bloqueado em `/usuarios` e `/auditoria`.
6. Desativar um usuário logado em outro navegador derruba a sessão dele no próximo clique.
7. Auditoria registra logins, criações e desativações com data/hora em horário de Brasília.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: README com setup e verificacao final da entrega 1"
```

---

## Fora do escopo deste plano (planos futuros)

- **Entrega 2:** cadastro de pacientes (blocos, busca com filtros) — próximo plano.
- **Entregas 3–5:** dados clínicos vivos + resumo, evoluções, documentos/exportações.
- **Plano de operação:** deploy em nuvem, HTTPS, backup diário criptografado com teste de restauração — obrigatório antes de qualquer dado real entrar no sistema.
- Troca de senha pelo próprio usuário e visualização de detalhes na auditoria (entram junto da Entrega 2).
