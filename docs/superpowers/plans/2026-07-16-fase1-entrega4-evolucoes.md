# Fase 1 — Entrega 4: Evoluções — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar evoluções clínicas numa linha do tempo única por paciente — tipadas por especialidade e autor, preenchidas a partir de templates, salvas como rascunho automaticamente, assinadas para virar imutáveis e complementadas por adendos.

**Architecture:** Segue os padrões das Entregas 1-3: regras de negócio em `src/lib/pacientes/evolucoes.ts` como funções testáveis com resultado discriminado (`{ok:true,id}` | `{ok:false,erro}`); server actions finas chamam `exigirPerfil` no servidor; tudo auditado via `registrarEvento`. Rascunho e evolução assinada são o MESMO modelo `Evolucao`, distinguidos por `assinadaEm` (nulo = rascunho editável; preenchido = imutável). Adendos são um modelo próprio ligado à evolução assinada. Salvamento automático usa uma server action chamada com debounce pelo cliente.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Prisma 6, PostgreSQL local nos testes, Vitest, Tailwind v4.

**Base:** Entregas 1-3 concluídas. Testes rodam em Postgres local efêmero (embedded-postgres) — rápidos e confiáveis.

---

## Decisões de escopo

- **Rascunho e assinada = um modelo só** (`Evolucao`), campo `assinadaEm` distingue. Simplifica a linha do tempo (uma consulta) e a regra de imutabilidade (uma checagem: `assinadaEm != null` → bloqueia edição).
- **Um rascunho aberto por autor+paciente+tipo.** Ao começar a evoluir, reusa o rascunho existente daquele autor/tipo se houver, senão cria. Evita dezenas de rascunhos órfãos.
- **Quem evolui e de qual tipo** é definido pelo perfil: médico→MEDICA, enfermagem→ENFERMAGEM, multiprofissional→NUTRICAO/PSICOLOGIA/SERVICO_SOCIAL (escolhe). Recepção e administrador **não** evoluem.
- **Assinada é imutável de verdade**: sem update, sem delete. Só adendo (que também é imutável após criado).
- **Templates** são texto padrão por tipo, carregados no formulário; o profissional edita livremente. Nesta entrega, os templates são constantes no código (config simples); um editor de templates administrável fica para depois (YAGNI).
- **Salvamento automático**: o cliente chama `acaoSalvarRascunho` com debounce (~2s após parar de digitar) e ao perder o foco. Não é colaboração em tempo real — é só não perder texto.

## Matriz de permissões

| Ação | Perfis |
|------|--------|
| Ver linha do tempo de evoluções | Médico, Enfermagem, Técnico, Multiprofissional (mesma leitura clínica da Entrega 3) |
| Criar/editar rascunho, assinar | Médico (MEDICA), Enfermagem (ENFERMAGEM), Multiprofissional (NUTRICAO/PSICOLOGIA/SERVICO_SOCIAL) |
| Adendo a evolução assinada | Mesmos que podem evoluir |
| Qualquer acesso | Recepção e Administrador: **negado** |

## Estrutura de arquivos ao final da entrega

```
prisma/schema.prisma            # + enum TipoEvolucao, models Evolucao e Adendo
src/lib/pacientes/
  evolucoes-perfis.ts           # tiposPermitidos(perfil) — que tipos cada perfil pode registrar
  evolucoes-templates.ts        # TEMPLATE_POR_TIPO — texto padrão por tipo
  evolucoes.ts                  # abrirRascunho/salvarRascunho/assinarEvolucao/adicionarAdendo/listarEvolucoes
src/app/(app)/pacientes/[id]/evolucoes/
  page.tsx                      # linha do tempo + acesso ao editor
  acoes.ts                      # server actions
  editor.tsx                    # editor de rascunho com salvamento automático (client)
  linha-do-tempo.tsx            # lista de evoluções assinadas + adendos (client p/ form de adendo)
tests/
  evolucoes-perfis.test.ts / evolucoes-servico.test.ts
```

---

### Task 1: Esquema de Evolucao e Adendo

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Acrescentar enum e modelos ao FINAL do schema**

Acrescente ao final de `prisma/schema.prisma` (não altere nada existente). Também acrescente as
duas relações inversas ao model `Paciente` existente, junto das que já existem (`acessos`,
`sorologias`, etc.): `evolucoes Evolucao[]`.

```prisma
enum TipoEvolucao {
  MEDICA
  ENFERMAGEM
  NUTRICAO
  PSICOLOGIA
  SERVICO_SOCIAL
}

model Evolucao {
  id         String       @id @default(cuid())
  pacienteId String
  autorId    String
  tipo       TipoEvolucao
  texto      String       @default("")
  assinadaEm DateTime? // nulo = rascunho editável; preenchido = imutável
  criadoEm   DateTime     @default(now())
  atualizadoEm DateTime   @updatedAt

  paciente Paciente @relation(fields: [pacienteId], references: [id], onDelete: Cascade)
  adendos  Adendo[]

  @@index([pacienteId, assinadaEm])
  @@index([autorId])
}

model Adendo {
  id         String   @id @default(cuid())
  evolucaoId String
  autorId    String
  texto      String
  criadoEm   DateTime @default(now())

  evolucao Evolucao @relation(fields: [evolucaoId], references: [id], onDelete: Cascade)

  @@index([evolucaoId])
}
```

E no model `Paciente`, na lista de relações inversas (onde já há `acessos`, `sorologias`,
`medicacoes`, `alergias`, `mudancasSituacao`), acrescente:

```prisma
  evolucoes Evolucao[]
```

- [ ] **Step 2: Gerar e aplicar a migração**

Run: `npx prisma migrate dev --name evolucoes`
Esperado: migração criada e aplicada no banco de desenvolvimento; client regenerado.

- [ ] **Step 3: Rodar os testes**

Run: `npm test`
Esperado: 82 testes seguem passando (nenhum toca Evolucao ainda). A suíte sobe um Postgres local
efêmero (embedded-postgres) e leva ~40s.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: esquema de evolucoes e adendos"
```

---

### Task 2: Perfis e tipos de evolução (TDD)

**Files:**
- Create: `src/lib/pacientes/evolucoes-perfis.ts`
- Test: `tests/evolucoes-perfis.test.ts`

- [ ] **Step 1: Escrever os testes (devem falhar)**

```ts
// tests/evolucoes-perfis.test.ts
import { describe, it, expect } from "vitest";
import { tiposPermitidos, podeEvoluir } from "@/lib/pacientes/evolucoes-perfis";

describe("tipos de evolução por perfil", () => {
  it("médico registra só evolução médica", () => {
    expect(tiposPermitidos("MEDICO")).toEqual(["MEDICA"]);
  });

  it("enfermagem registra só evolução de enfermagem", () => {
    expect(tiposPermitidos("ENFERMAGEM")).toEqual(["ENFERMAGEM"]);
  });

  it("multiprofissional registra nutrição, psicologia e serviço social", () => {
    expect(tiposPermitidos("MULTIPROFISSIONAL")).toEqual(["NUTRICAO", "PSICOLOGIA", "SERVICO_SOCIAL"]);
  });

  it("recepção, técnico e administrador não evoluem", () => {
    for (const perfil of ["RECEPCAO", "TECNICO", "ADMINISTRADOR"] as const) {
      expect(tiposPermitidos(perfil)).toEqual([]);
      expect(podeEvoluir(perfil)).toBe(false);
    }
  });

  it("podeEvoluir é true para quem tem ao menos um tipo", () => {
    expect(podeEvoluir("MEDICO")).toBe(true);
    expect(podeEvoluir("MULTIPROFISSIONAL")).toBe(true);
  });
});
```

- [ ] **Step 2: Verificar que falham**

Run: `npm test -- evolucoes-perfis`
Esperado: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```ts
// src/lib/pacientes/evolucoes-perfis.ts
import type { Perfil, TipoEvolucao } from "@prisma/client";

const TIPOS_POR_PERFIL: Record<Perfil, TipoEvolucao[]> = {
  MEDICO: ["MEDICA"],
  ENFERMAGEM: ["ENFERMAGEM"],
  MULTIPROFISSIONAL: ["NUTRICAO", "PSICOLOGIA", "SERVICO_SOCIAL"],
  TECNICO: [],
  RECEPCAO: [],
  ADMINISTRADOR: [],
};

export function tiposPermitidos(perfil: Perfil): TipoEvolucao[] {
  return TIPOS_POR_PERFIL[perfil];
}

export function podeEvoluir(perfil: Perfil): boolean {
  return TIPOS_POR_PERFIL[perfil].length > 0;
}
```

- [ ] **Step 4: Verificar que passam**

Run: `npm test -- evolucoes-perfis`
Esperado: 5 testes passando.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: tipos de evolucao permitidos por perfil"
```

---

### Task 3: Templates por tipo

**Files:**
- Create: `src/lib/pacientes/evolucoes-templates.ts`

- [ ] **Step 1: Criar o módulo de templates**

Não precisa de teste dedicado (é dado estático); será exercitado pelo serviço e pela UI.

```ts
// src/lib/pacientes/evolucoes-templates.ts
import type { TipoEvolucao } from "@prisma/client";

// Texto padrão carregado no editor ao abrir um rascunho novo. O profissional edita livremente.
// Um editor administrável de templates fica para uma entrega futura (YAGNI).
export const TEMPLATE_POR_TIPO: Record<TipoEvolucao, string> = {
  MEDICA:
    "Subjetivo:\n\nObjetivo (exame físico, intercorrências na sessão):\n\nAvaliação:\n\nConduta:\n",
  ENFERMAGEM:
    "Acesso (condição, punção):\n\nPeso pré/pós e intercorrências na sessão:\n\nCuidados prestados:\n\nObservações:\n",
  NUTRICAO:
    "Estado nutricional:\n\nIngestão / adesão à dieta:\n\nExames (albumina, fósforo, potássio):\n\nConduta nutricional:\n",
  PSICOLOGIA:
    "Demanda / queixa:\n\nEstado emocional:\n\nIntervenção realizada:\n\nEncaminhamentos:\n",
  SERVICO_SOCIAL:
    "Situação socioeconômica:\n\nRede de apoio / transporte:\n\nBenefícios e documentação:\n\nEncaminhamentos:\n",
};
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Esperado: "Compiled successfully".

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: templates de evolucao por tipo"
```

---

### Task 4: Serviço de evoluções (TDD)

**Files:**
- Create: `src/lib/pacientes/evolucoes.ts`
- Modify: `tests/ajuda.ts` (limpeza de Evolucao/Adendo)
- Test: `tests/evolucoes-servico.test.ts`

- [ ] **Step 1: Acrescentar limpeza ao helper**

Em `tests/ajuda.ts`, dentro de `limparBanco`, ANTES de `db.paciente.deleteMany()`, acrescente as
duas linhas (a ordem importa: Adendo referencia Evolucao):

```ts
  await db.adendo.deleteMany();
  await db.evolucao.deleteMany();
```

- [ ] **Step 2: Escrever os testes (devem falhar)**

```ts
// tests/evolucoes-servico.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  abrirRascunho, salvarRascunho, assinarEvolucao, adicionarAdendo, listarEvolucoes,
} from "@/lib/pacientes/evolucoes";
import { criarPaciente } from "@/lib/pacientes/servico";
import { criarUsuarioTeste, limparBanco } from "./ajuda";
import { db } from "@/lib/db";

const PACIENTE = {
  nome: "Ana Souza", cpf: "529.982.247-25",
  dataNascimento: new Date("1960-05-10"), sexo: "FEMININO" as const, tipoVinculo: "SUS" as const,
};

async function cenario() {
  const medico = await criarUsuarioTeste({ perfil: "MEDICO", email: "med@clinica.local" });
  const criado = await criarPaciente(PACIENTE, medico.id);
  if (!criado.ok) throw new Error("falhou");
  return { medico, pacienteId: criado.id };
}

describe("serviço de evoluções", () => {
  beforeEach(limparBanco);

  it("abrir rascunho cria uma evolução não assinada com o template", async () => {
    const { medico, pacienteId } = await cenario();
    const r = await abrirRascunho(pacienteId, "MEDICA", medico.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ev = await db.evolucao.findUnique({ where: { id: r.id } });
    expect(ev?.assinadaEm).toBeNull();
    expect(ev?.texto.length).toBeGreaterThan(0); // veio com template
  });

  it("abrir rascunho reusa o rascunho aberto do mesmo autor e tipo", async () => {
    const { medico, pacienteId } = await cenario();
    const a = await abrirRascunho(pacienteId, "MEDICA", medico.id);
    const b = await abrirRascunho(pacienteId, "MEDICA", medico.id);
    expect(a.ok && b.ok && a.id === b.id).toBe(true);
    expect(await db.evolucao.count()).toBe(1);
  });

  it("salvar rascunho atualiza o texto", async () => {
    const { medico, pacienteId } = await cenario();
    const r = await abrirRascunho(pacienteId, "MEDICA", medico.id);
    if (!r.ok) throw new Error("falhou");
    await salvarRascunho(r.id, "Paciente estável, sem intercorrências.", medico.id);
    const ev = await db.evolucao.findUnique({ where: { id: r.id } });
    expect(ev?.texto).toBe("Paciente estável, sem intercorrências.");
  });

  it("não salva rascunho de outro autor", async () => {
    const { medico, pacienteId } = await cenario();
    const outro = await criarUsuarioTeste({ perfil: "MEDICO", email: "outro@clinica.local" });
    const r = await abrirRascunho(pacienteId, "MEDICA", medico.id);
    if (!r.ok) throw new Error("falhou");
    const res = await salvarRascunho(r.id, "invasão", outro.id);
    expect(res).toEqual({ ok: false, erro: "Você só pode editar seus próprios rascunhos." });
  });

  it("assinar exige texto não vazio", async () => {
    const { medico, pacienteId } = await cenario();
    const r = await abrirRascunho(pacienteId, "MEDICA", medico.id);
    if (!r.ok) throw new Error("falhou");
    await salvarRascunho(r.id, "   ", medico.id);
    const res = await assinarEvolucao(r.id, medico.id);
    expect(res).toEqual({ ok: false, erro: "A evolução está vazia." });
  });

  it("assinar torna a evolução imutável e audita", async () => {
    const { medico, pacienteId } = await cenario();
    const r = await abrirRascunho(pacienteId, "MEDICA", medico.id);
    if (!r.ok) throw new Error("falhou");
    await salvarRascunho(r.id, "Conduta mantida.", medico.id);
    const res = await assinarEvolucao(r.id, medico.id);
    expect(res.ok).toBe(true);
    const ev = await db.evolucao.findUnique({ where: { id: r.id } });
    expect(ev?.assinadaEm).not.toBeNull();
    const eventos = await db.eventoAuditoria.findMany({ where: { acao: "paciente.evolucao.assinar" } });
    expect(eventos).toHaveLength(1);
    // não dá para salvar depois de assinada
    const depois = await salvarRascunho(r.id, "tentativa de edição", medico.id);
    expect(depois).toEqual({ ok: false, erro: "Evolução assinada não pode ser editada." });
  });

  it("adendo só em evolução assinada, e fica registrado", async () => {
    const { medico, pacienteId } = await cenario();
    const r = await abrirRascunho(pacienteId, "MEDICA", medico.id);
    if (!r.ok) throw new Error("falhou");
    await salvarRascunho(r.id, "Evolução inicial.", medico.id);

    // antes de assinar: adendo é rejeitado
    const cedo = await adicionarAdendo(r.id, "não pode ainda", medico.id);
    expect(cedo).toEqual({ ok: false, erro: "Só evolução assinada aceita adendo." });

    await assinarEvolucao(r.id, medico.id);
    const res = await adicionarAdendo(r.id, "Correção: PA aferida às 14h.", medico.id);
    expect(res.ok).toBe(true);
    const adendos = await db.adendo.findMany({ where: { evolucaoId: r.id } });
    expect(adendos).toHaveLength(1);
    expect(adendos[0].texto).toBe("Correção: PA aferida às 14h.");
  });

  it("linha do tempo traz só assinadas, mais recente primeiro, com adendos", async () => {
    const { medico, pacienteId } = await cenario();
    const rascunho = await abrirRascunho(pacienteId, "MEDICA", medico.id);
    if (!rascunho.ok) throw new Error("falhou");
    // rascunho não assinado não aparece
    let linha = await listarEvolucoes(pacienteId);
    expect(linha).toHaveLength(0);

    await salvarRascunho(rascunho.id, "Primeira evolução.", medico.id);
    await assinarEvolucao(rascunho.id, medico.id);
    await adicionarAdendo(rascunho.id, "Adendo à primeira.", medico.id);

    linha = await listarEvolucoes(pacienteId);
    expect(linha).toHaveLength(1);
    expect(linha[0].texto).toBe("Primeira evolução.");
    expect(linha[0].adendos).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Verificar que falham**

Run: `npm test -- evolucoes-servico`
Esperado: FAIL — módulo `@/lib/pacientes/evolucoes` não existe.

- [ ] **Step 4: Implementar**

```ts
// src/lib/pacientes/evolucoes.ts
import { db } from "@/lib/db";
import { registrarEvento } from "@/lib/auditoria";
import { TEMPLATE_POR_TIPO } from "./evolucoes-templates";
import type { Adendo, Evolucao, TipoEvolucao } from "@prisma/client";

export type ResultadoEvolucao = { ok: true; id: string } | { ok: false; erro: string };
export type EvolucaoComAdendos = Evolucao & { adendos: Adendo[] };

// Reusa o rascunho aberto (não assinado) do autor para aquele tipo; senão cria um com o template.
export async function abrirRascunho(
  pacienteId: string,
  tipo: TipoEvolucao,
  autorId: string,
): Promise<ResultadoEvolucao> {
  const existente = await db.evolucao.findFirst({
    where: { pacienteId, tipo, autorId, assinadaEm: null },
  });
  if (existente) return { ok: true, id: existente.id };

  const evolucao = await db.evolucao.create({
    data: { pacienteId, tipo, autorId, texto: TEMPLATE_POR_TIPO[tipo] },
  });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.evolucao.abrir_rascunho",
    entidade: "Evolucao",
    entidadeId: evolucao.id,
    detalhes: { pacienteId, tipo },
  });
  return { ok: true, id: evolucao.id };
}

export async function salvarRascunho(
  evolucaoId: string,
  texto: string,
  autorId: string,
): Promise<ResultadoEvolucao> {
  const ev = await db.evolucao.findUnique({ where: { id: evolucaoId } });
  if (!ev) return { ok: false, erro: "Evolução não encontrada." };
  if (ev.autorId !== autorId) return { ok: false, erro: "Você só pode editar seus próprios rascunhos." };
  if (ev.assinadaEm) return { ok: false, erro: "Evolução assinada não pode ser editada." };

  await db.evolucao.update({ where: { id: evolucaoId }, data: { texto } });
  return { ok: true, id: evolucaoId };
}

export async function assinarEvolucao(evolucaoId: string, autorId: string): Promise<ResultadoEvolucao> {
  const ev = await db.evolucao.findUnique({ where: { id: evolucaoId } });
  if (!ev) return { ok: false, erro: "Evolução não encontrada." };
  if (ev.autorId !== autorId) return { ok: false, erro: "Você só pode assinar suas próprias evoluções." };
  if (ev.assinadaEm) return { ok: false, erro: "Evolução já está assinada." };
  if (!ev.texto.trim()) return { ok: false, erro: "A evolução está vazia." };

  await db.evolucao.update({ where: { id: evolucaoId }, data: { assinadaEm: new Date() } });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.evolucao.assinar",
    entidade: "Evolucao",
    entidadeId: evolucaoId,
    detalhes: { pacienteId: ev.pacienteId, tipo: ev.tipo },
  });
  return { ok: true, id: evolucaoId };
}

export async function adicionarAdendo(
  evolucaoId: string,
  texto: string,
  autorId: string,
): Promise<ResultadoEvolucao> {
  if (!texto.trim()) return { ok: false, erro: "O adendo está vazio." };
  const ev = await db.evolucao.findUnique({ where: { id: evolucaoId } });
  if (!ev) return { ok: false, erro: "Evolução não encontrada." };
  if (!ev.assinadaEm) return { ok: false, erro: "Só evolução assinada aceita adendo." };

  const adendo = await db.adendo.create({ data: { evolucaoId, autorId, texto: texto.trim() } });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.evolucao.adendo",
    entidade: "Adendo",
    entidadeId: adendo.id,
    detalhes: { evolucaoId, pacienteId: ev.pacienteId },
  });
  return { ok: true, id: adendo.id };
}

export function listarEvolucoes(pacienteId: string): Promise<EvolucaoComAdendos[]> {
  return db.evolucao.findMany({
    where: { pacienteId, assinadaEm: { not: null } },
    orderBy: { assinadaEm: "desc" },
    include: { adendos: { orderBy: { criadoEm: "asc" } } },
  });
}
```

- [ ] **Step 5: Verificar que passam**

Run: `npm test -- evolucoes-servico`
Esperado: 8 testes passando.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: servico de evolucoes com rascunho, assinatura e adendos"
```

---

### Task 5: Server actions de evolução

**Files:**
- Create: `src/app/(app)/pacientes/[id]/evolucoes/acoes.ts`

- [ ] **Step 1: Criar as actions**

```ts
// src/app/(app)/pacientes/[id]/evolucoes/acoes.ts
"use server";

import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/auth/contexto";
import { perfilPermitido } from "@/lib/perfis";
import { tiposPermitidos } from "@/lib/pacientes/evolucoes-perfis";
import {
  abrirRascunho, salvarRascunho, assinarEvolucao, adicionarAdendo,
} from "@/lib/pacientes/evolucoes";
import type { TipoEvolucao } from "@prisma/client";

export type EstadoEvolucao = { erro: string } | { rascunhoId: string } | undefined;

async function exigirAutorDeTipo(tipo: TipoEvolucao) {
  const usuario = await exigirUsuario();
  if (!tiposPermitidos(usuario.perfil).includes(tipo)) {
    throw new Error("sem_permissao");
  }
  return usuario;
}

export async function acaoAbrirRascunho(pacienteId: string, tipo: TipoEvolucao): Promise<EstadoEvolucao> {
  let usuario;
  try {
    usuario = await exigirAutorDeTipo(tipo);
  } catch {
    return { erro: "Seu perfil não registra esse tipo de evolução." };
  }
  const r = await abrirRascunho(pacienteId, tipo, usuario.id);
  if (!r.ok) return { erro: r.erro };
  return { rascunhoId: r.id };
}

// Salvamento automático: chamado pelo cliente com debounce. Retorna erro discreto se falhar.
export async function acaoSalvarRascunho(evolucaoId: string, texto: string): Promise<EstadoEvolucao> {
  const usuario = await exigirUsuario();
  const r = await salvarRascunho(evolucaoId, texto, usuario.id);
  if (!r.ok) return { erro: r.erro };
  return undefined;
}

export async function acaoAssinar(pacienteId: string, evolucaoId: string): Promise<EstadoEvolucao> {
  const usuario = await exigirUsuario();
  const r = await assinarEvolucao(evolucaoId, usuario.id);
  if (!r.ok) return { erro: r.erro };
  revalidatePath(`/pacientes/${pacienteId}/evolucoes`);
  return undefined;
}

export async function acaoAdendo(_anterior: EstadoEvolucao, formData: FormData): Promise<EstadoEvolucao> {
  const usuario = await exigirUsuario();
  const pacienteId = String(formData.get("pacienteId") ?? "");
  const evolucaoId = String(formData.get("evolucaoId") ?? "");
  const r = await adicionarAdendo(evolucaoId, String(formData.get("texto") ?? ""), usuario.id);
  if (!r.ok) return { erro: r.erro };
  revalidatePath(`/pacientes/${pacienteId}/evolucoes`);
  return undefined;
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Esperado: compila (a página que usa essas actions vem na Task 6, mas as actions compilam sozinhas).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: server actions de evolucao"
```

---

### Task 6: Editor de rascunho com salvamento automático

**Files:**
- Create: `src/app/(app)/pacientes/[id]/evolucoes/editor.tsx`

- [ ] **Step 1: Criar o editor (client component)**

```tsx
// src/app/(app)/pacientes/[id]/evolucoes/editor.tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { acaoSalvarRascunho, acaoAssinar } from "./acoes";

type Estado = "salvo" | "salvando" | "erro" | "editando";

export function EditorRascunho({
  pacienteId,
  evolucaoId,
  textoInicial,
}: {
  pacienteId: string;
  evolucaoId: string;
  textoInicial: string;
}) {
  const [texto, setTexto] = useState(textoInicial);
  const [estado, setEstado] = useState<Estado>("salvo");
  const [erro, setErro] = useState<string | null>(null);
  const [assinando, iniciarAssinatura] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Salvamento automático: 2s após parar de digitar. Não perde texto por queda de conexão.
  useEffect(() => {
    if (texto === textoInicial && estado === "salvo") return;
    setEstado("editando");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setEstado("salvando");
      const r = await acaoSalvarRascunho(evolucaoId, texto);
      if (r && "erro" in r) {
        setEstado("erro");
        setErro(r.erro);
      } else {
        setEstado("salvo");
        setErro(null);
      }
    }, 2000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  const rotuloEstado =
    estado === "salvando" ? "Salvando..."
    : estado === "editando" ? "Editando..."
    : estado === "erro" ? "Falha ao salvar"
    : "Rascunho salvo";

  function assinar() {
    setErro(null);
    iniciarAssinatura(async () => {
      // salva o texto atual antes de assinar, para não assinar versão desatualizada
      await acaoSalvarRascunho(evolucaoId, texto);
      const r = await acaoAssinar(pacienteId, evolucaoId);
      if (r && "erro" in r) setErro(r.erro);
    });
  }

  return (
    <div className="rounded bg-white p-6 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Rascunho</h2>
        <span className={estado === "erro" ? "text-xs text-red-600" : "text-xs text-slate-400"}>
          {rotuloEstado}
        </span>
      </div>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={16}
        className="w-full rounded border border-slate-300 p-3 font-mono text-sm"
      />
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={assinar}
          disabled={assinando || !texto.trim()}
          className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {assinando ? "Assinando..." : "Assinar evolução"}
        </button>
        <span className="text-xs text-slate-400">
          Assinar torna a evolução definitiva — depois, só adendos.
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Esperado: compila.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: editor de rascunho com salvamento automatico"
```

---

### Task 7: Linha do tempo e página de evoluções

**Files:**
- Create: `src/app/(app)/pacientes/[id]/evolucoes/linha-do-tempo.tsx`, `src/app/(app)/pacientes/[id]/evolucoes/page.tsx`
- Modify: `src/app/(app)/pacientes/[id]/page.tsx` (link para evoluções)

- [ ] **Step 1: Componente da linha do tempo (com form de adendo)**

```tsx
// src/app/(app)/pacientes/[id]/evolucoes/linha-do-tempo.tsx
"use client";

import { useActionState } from "react";
import { acaoAdendo } from "./acoes";
import type { Adendo, Evolucao, TipoEvolucao } from "@prisma/client";

const ROTULO_TIPO: Record<TipoEvolucao, string> = {
  MEDICA: "Médica",
  ENFERMAGEM: "Enfermagem",
  NUTRICAO: "Nutrição",
  PSICOLOGIA: "Psicologia",
  SERVICO_SOCIAL: "Serviço social",
};

function formatarDataHora(data: Date): string {
  return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function FormAdendo({ pacienteId, evolucaoId }: { pacienteId: string; evolucaoId: string }) {
  const [estado, acao, pendente] = useActionState(acaoAdendo, undefined);
  return (
    <form action={acao} className="mt-3 border-t pt-3">
      <input type="hidden" name="pacienteId" value={pacienteId} />
      <input type="hidden" name="evolucaoId" value={evolucaoId} />
      <textarea
        name="texto" rows={2} placeholder="Adicionar adendo..."
        className="w-full rounded border border-slate-300 p-2 text-sm"
      />
      {estado && "erro" in estado && <p className="text-sm text-red-600">{estado.erro}</p>}
      <button
        type="submit" disabled={pendente}
        className="mt-1 rounded bg-slate-700 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pendente ? "Adicionando..." : "Adicionar adendo"}
      </button>
    </form>
  );
}

export function LinhaDoTempo({
  pacienteId,
  evolucoes,
  nomePorAutor,
  podeEvoluir,
}: {
  pacienteId: string;
  evolucoes: (Evolucao & { adendos: Adendo[] })[];
  nomePorAutor: Record<string, string>;
  podeEvoluir: boolean;
}) {
  if (evolucoes.length === 0) {
    return <p className="text-sm text-slate-500">Nenhuma evolução assinada ainda.</p>;
  }
  return (
    <div className="space-y-4">
      {evolucoes.map((ev) => (
        <article key={ev.id} className="rounded bg-white p-5 shadow-sm">
          <header className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700">
              {ROTULO_TIPO[ev.tipo]} — {nomePorAutor[ev.autorId] ?? "Autor"}
            </span>
            <span className="text-slate-400">{ev.assinadaEm ? formatarDataHora(ev.assinadaEm) : ""}</span>
          </header>
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800">{ev.texto}</pre>
          {ev.adendos.length > 0 && (
            <div className="mt-3 space-y-2 border-l-2 border-slate-200 pl-3">
              {ev.adendos.map((a) => (
                <div key={a.id} className="text-sm">
                  <div className="text-xs text-slate-400">
                    Adendo · {nomePorAutor[a.autorId] ?? "Autor"} · {formatarDataHora(a.criadoEm)}
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-slate-700">{a.texto}</pre>
                </div>
              ))}
            </div>
          )}
          {podeEvoluir && <FormAdendo pacienteId={pacienteId} evolucaoId={ev.id} />}
        </article>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Página de evoluções**

```tsx
// src/app/(app)/pacientes/[id]/evolucoes/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_CLINICO_LEITURA } from "@/lib/pacientes/permissoes";
import { podeEvoluir, tiposPermitidos } from "@/lib/pacientes/evolucoes-perfis";
import { abrirRascunho, listarEvolucoes } from "@/lib/pacientes/evolucoes";
import { db } from "@/lib/db";
import { registrarEvento } from "@/lib/auditoria";
import { EditorRascunho } from "./editor";
import { LinhaDoTempo } from "./linha-do-tempo";
import type { TipoEvolucao } from "@prisma/client";

const ROTULO_TIPO: Record<TipoEvolucao, string> = {
  MEDICA: "Médica",
  ENFERMAGEM: "Enfermagem",
  NUTRICAO: "Nutrição",
  PSICOLOGIA: "Psicologia",
  SERVICO_SOCIAL: "Serviço social",
};

export default async function PaginaEvolucoes({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string }>;
}) {
  const usuario = await exigirPerfil(...PERFIS_CLINICO_LEITURA);
  const { id } = await params;
  const { tipo: tipoParam } = await searchParams;

  const paciente = await db.paciente.findUnique({ where: { id }, select: { id: true, nome: true } });
  if (!paciente) notFound();

  await registrarEvento({
    usuarioId: usuario.id,
    acao: "paciente.evolucoes.visualizar",
    entidade: "Paciente",
    entidadeId: id,
  });

  const meusTipos = tiposPermitidos(usuario.perfil);
  const autorPodeEvoluir = podeEvoluir(usuario.perfil);

  // Se o autor escolheu um tipo válido, abre/reusa o rascunho dele daquele tipo.
  let rascunho: { id: string; texto: string } | null = null;
  const tipoEscolhido = meusTipos.includes(tipoParam as TipoEvolucao) ? (tipoParam as TipoEvolucao) : null;
  if (tipoEscolhido) {
    const r = await abrirRascunho(id, tipoEscolhido, usuario.id);
    if (r.ok) {
      const ev = await db.evolucao.findUnique({ where: { id: r.id }, select: { id: true, texto: true } });
      if (ev) rascunho = ev;
    }
  }

  const evolucoes = await listarEvolucoes(id);
  const autorIds = [
    ...new Set([...evolucoes.map((e) => e.autorId), ...evolucoes.flatMap((e) => e.adendos.map((a) => a.autorId))]),
  ];
  const autores = await db.usuario.findMany({ where: { id: { in: autorIds } }, select: { id: true, nome: true } });
  const nomePorAutor = Object.fromEntries(autores.map((a) => [a.id, a.nome]));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href={`/pacientes/${id}`} className="text-sm text-blue-700 hover:underline">← Ficha</Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-800">Evoluções — {paciente.nome}</h1>
      </div>

      {autorPodeEvoluir && (
        <div className="flex flex-wrap gap-2">
          {meusTipos.map((t) => (
            <Link
              key={t}
              href={`/pacientes/${id}/evolucoes?tipo=${t}`}
              className={
                t === tipoEscolhido
                  ? "rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white"
                  : "rounded bg-white px-3 py-1.5 text-sm text-blue-700 shadow-sm hover:underline"
              }
            >
              Nova evolução {ROTULO_TIPO[t].toLowerCase()}
            </Link>
          ))}
        </div>
      )}

      {rascunho && (
        <EditorRascunho pacienteId={id} evolucaoId={rascunho.id} textoInicial={rascunho.texto} />
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Linha do tempo</h2>
        <LinhaDoTempo
          pacienteId={id}
          evolucoes={evolucoes}
          nomePorAutor={nomePorAutor}
          podeEvoluir={autorPodeEvoluir}
        />
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Link na ficha do paciente**

Em `src/app/(app)/pacientes/[id]/page.tsx`, dentro do bloco `{podeVerClinico && (` do cabeçalho
(onde já existe o link "Ver resumo do paciente →"), acrescente logo depois um segundo link:

```tsx
        <Link
          href={`/pacientes/${paciente.id}/evolucoes`}
          className="mt-1 ml-4 inline-block text-sm text-blue-700 hover:underline"
        >
          Evoluções →
        </Link>
```

- [ ] **Step 4: Verificação**

Run: `npm test` e `npm run build`
Esperado: 95 testes passando (82 + 5 perfis + 8 serviço); build com a rota `ƒ /pacientes/[id]/evolucoes`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: linha do tempo de evolucoes e pagina do paciente"
```

---

### Task 8: Verificação final

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Documentar evoluções no README**

Na seção de estrutura/funcionalidades do `README.md`, acrescente uma linha na lista de módulos:

```markdown
- `src/lib/pacientes/evolucoes.ts` — evoluções (rascunho, assinatura imutável, adendos, linha do tempo).
```

- [ ] **Step 2: Verificação completa**

Run: `npm run lint && npm test && npm run build`
Esperado: lint limpo, 95 testes passando, build ok.

Rotas esperadas: além das já existentes, `ƒ /pacientes/[id]/evolucoes`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: README com modulo de evolucoes"
```

---

## Checklist manual (controlador, no navegador)

1. Como médico: abrir paciente → "Evoluções" → "Nova evolução médica" carrega o template no editor.
2. Digitar; após ~2s aparece "Rascunho salvo"; recarregar a página mantém o texto.
3. Assinar → evolução aparece na linha do tempo, editor some; o texto não é mais editável.
4. Adicionar adendo → aparece indentado sob a evolução, com autor e data.
5. Como enfermagem: só vê "Nova evolução enfermagem"; não consegue assinar evolução do médico (é de outro autor/tipo).
6. Como recepção/admin: `/pacientes/[id]/evolucoes` → redireciona para /sem-permissao.
7. Auditoria (admin): eventos `paciente.evolucao.abrir_rascunho`, `assinar`, `adendo` aparecem.

## Fora do escopo (Entrega 5)

- Foto do paciente, documentos anexados, PDF do prontuário, exportação de listas para Excel.
- Editor administrável de templates (hoje são constantes no código).
