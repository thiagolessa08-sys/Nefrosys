# Fase 1 — Entrega 3: Dados Clínicos Vivos + Resumo do Paciente — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) ou superpowers:executing-plans para implementar tarefa a tarefa. Passos usam checkbox (`- [ ]`).

**Goal:** Registrar e exibir os dados clínicos que mudam ao longo do tratamento — acessos vasculares, sorologias, medicações e alergias — com histórico, e reunir tudo numa tela de resumo que é a primeira visão de qualquer paciente. Ataca a dor nº 2 do Nefrosys ("falta visão geral do paciente").

**Architecture:** Segue os padrões das Entregas 1–2: regras em `src/lib/pacientes/` como funções testáveis com resultado discriminado (`{ok:true,id}` | `{ok:false,erro}`); páginas e server actions são camada fina que chamam `exigirPerfil` no servidor; toda leitura e escrita de dado clínico é auditada. Cada tipo de dado clínico é uma tabela própria com histórico (nunca campo único), então o "atual" é derivado por consulta, não sobrescrito.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Prisma 6, PostgreSQL (Railway), Vitest, Tailwind v4.

**Base:** Entregas 1 e 2 concluídas — auth com 6 perfis, auditoria, cadastro de pacientes, busca.

---

## Decisões de escopo e correção de permissão

- **Correção da Entrega 2 (importante):** o spec (seção 4.1) diz que Recepção **não acessa conteúdo clínico**. Na Entrega 2, a ficha mostrava os dados nefrológicos (CID, modalidade, início da diálise) em leitura para a recepção — isso viola o spec. Esta entrega introduz o conceito `PERFIS_CLINICO_LEITURA` e **esconde toda a seção clínica da recepção**: ela passa a ver apenas identificação e vínculo.
- **Quem vê conteúdo clínico:** Médico, Enfermagem, Técnico, Multiprofissional. **Quem edita conteúdo clínico:** Médico, Enfermagem (mantém `PERFIS_CLINICO_PACIENTE` da Entrega 2). Recepção e Administrador: não veem.
- **Evoluções ficam na Entrega 4.** O resumo reserva um espaço para "últimas evoluções" mas exibe um aviso de que chegam depois — não inventa a tabela agora.
- **Foto e documentos continuam na Entrega 5.**
- Sorologias cobrem **HBsAg, Anti-HCV, HIV** (as três que definem sala/máquina em diálise). Resultado é POSITIVO / NEGATIVO / INDETERMINADO, com data.

## Matriz de permissões desta entrega

| Ação | Perfis |
|------|--------|
| Ver identificação/vínculo do paciente | Recepção, Médico, Enfermagem, Técnico, Multiprofissional |
| **Ver** conteúdo clínico (nefrológicos, acessos, sorologias, medicações, alergias, resumo) | Médico, Enfermagem, Técnico, Multiprofissional |
| **Editar** conteúdo clínico | Médico, Enfermagem |
| Qualquer acesso a paciente | **Administrador: negado** |

## Estrutura de arquivos ao final da entrega

```
prisma/schema.prisma            # + enums e models AcessoVascular, Sorologia, Medicacao, Alergia
prisma/seed-demo.ts             # + dados clínicos fictícios para os 10 pacientes
src/lib/pacientes/
  permissoes.ts                 # + PERFIS_CLINICO_LEITURA
  acessos.ts                    # registrarAcesso / marcarAcessoPerdido / listarAcessos
  sorologias.ts                 # registrarSorologia / sorologiasAtuais
  medicacoes.ts                 # adicionarMedicacao / suspenderMedicacao ; alergias.ts junto
  resumo.ts                     # montarResumo(pacienteId)
  busca.ts                      # + filtros sorologiaPositiva e tipoAcesso
src/app/(app)/pacientes/[id]/
  page.tsx                      # ficha: esconde clínico da recepção, adiciona seções clínicas
  resumo/page.tsx               # tela de resumo
  secao-acessos.tsx / secao-sorologias.tsx / secao-medicacoes-alergias.tsx
tests/
  acessos.test.ts / sorologias.test.ts / medicacoes.test.ts / resumo.test.ts /
  busca-clinica.test.ts / permissoes.test.ts (atualizado)
```

---

### Task 1: Esquema dos dados clínicos

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Acrescentar enums e models ao FINAL do schema** (não remova nada existente)

```prisma
enum TipoAcesso {
  FISTULA
  CATETER
  PROTESE
}

enum SituacaoAcesso {
  EM_USO
  PERDIDO
}

enum TipoSorologia {
  HBSAG
  ANTI_HCV
  HIV
}

enum ResultadoSorologia {
  POSITIVO
  NEGATIVO
  INDETERMINADO
}

model AcessoVascular {
  id           String         @id @default(cuid())
  pacienteId   String
  tipo         TipoAcesso
  localizacao  String
  dataConfeccao DateTime
  situacao     SituacaoAcesso @default(EM_USO)
  observacao   String?
  criadoEm     DateTime       @default(now())

  paciente Paciente @relation(fields: [pacienteId], references: [id], onDelete: Cascade)

  @@index([pacienteId])
}

model Sorologia {
  id         String             @id @default(cuid())
  pacienteId String
  tipo       TipoSorologia
  resultado  ResultadoSorologia
  dataExame  DateTime
  criadoEm   DateTime           @default(now())

  paciente Paciente @relation(fields: [pacienteId], references: [id], onDelete: Cascade)

  @@index([pacienteId])
}

model Medicacao {
  id         String    @id @default(cuid())
  pacienteId String
  nome       String
  dose       String?
  posologia  String?
  ativa      Boolean   @default(true)
  suspensaEm DateTime?
  criadoEm   DateTime  @default(now())

  paciente Paciente @relation(fields: [pacienteId], references: [id], onDelete: Cascade)

  @@index([pacienteId])
}

model Alergia {
  id         String   @id @default(cuid())
  pacienteId String
  descricao  String
  criadoEm   DateTime @default(now())

  paciente Paciente @relation(fields: [pacienteId], references: [id], onDelete: Cascade)

  @@index([pacienteId])
}
```

Também acrescente as relações inversas no model `Paciente` existente. Localize o bloco de relações
do `Paciente` (que hoje tem `mudancasSituacao MudancaSituacao[]`) e acrescente ao lado:

```prisma
  acessos     AcessoVascular[]
  sorologias  Sorologia[]
  medicacoes  Medicacao[]
  alergias    Alergia[]
```

- [ ] **Step 2: Migração**

Run: `npx prisma migrate dev --name dados-clinicos`
Esperado: migração criada e aplicada; client regenerado.

- [ ] **Step 3: Testes**

Run: `npm test`
Esperado: 63 testes seguem passando.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: esquema de acessos, sorologias, medicacoes e alergias"
```

---

### Task 2: Permissão de leitura clínica + correção da ficha

**Files:**
- Modify: `src/lib/pacientes/permissoes.ts`, `tests/pacientes-permissoes.test.ts`
- Modify: `src/app/(app)/pacientes/[id]/page.tsx`

- [ ] **Step 1: Acrescentar teste (deve falhar)**

Em `tests/pacientes-permissoes.test.ts`, acrescente ao final do `describe`:

```ts
  it("leitura clínica exclui recepção e administrador, inclui os demais", async () => {
    const { PERFIS_CLINICO_LEITURA } = await import("@/lib/pacientes/permissoes");
    expect(PERFIS_CLINICO_LEITURA).not.toContain("ADMINISTRADOR");
    expect(PERFIS_CLINICO_LEITURA).not.toContain("RECEPCAO");
    for (const perfil of ["MEDICO", "ENFERMAGEM", "TECNICO", "MULTIPROFISSIONAL"] as const) {
      expect(PERFIS_CLINICO_LEITURA).toContain(perfil);
    }
  });
```

Run: `npm test -- pacientes-permissoes` → Esperado: FAIL (PERFIS_CLINICO_LEITURA undefined).

- [ ] **Step 2: Implementar a lista**

Em `src/lib/pacientes/permissoes.ts`, acrescente ao final:

```ts
// Quem pode VER conteúdo clínico. Recepção vê só identificação/vínculo (spec 4.1).
export const PERFIS_CLINICO_LEITURA: readonly Perfil[] = [
  "MEDICO",
  "ENFERMAGEM",
  "TECNICO",
  "MULTIPROFISSIONAL",
];
```

Run: `npm test -- pacientes-permissoes` → Esperado: 5 testes passando.

- [ ] **Step 3: Esconder a seção clínica da recepção na ficha**

Em `src/app/(app)/pacientes/[id]/page.tsx`, acrescente ao import de permissões o
`PERFIS_CLINICO_LEITURA`:

```ts
import { PERFIS_LEITURA_PACIENTE, PERFIS_CLINICO_PACIENTE, PERFIS_CLINICO_LEITURA } from "@/lib/pacientes/permissoes";
```

Logo após a linha `const podeEditarClinico = perfilPermitido(usuario.perfil, PERFIS_CLINICO_PACIENTE);`
acrescente:

```ts
  const podeVerClinico = perfilPermitido(usuario.perfil, PERFIS_CLINICO_LEITURA);
```

Envolva as DUAS seções clínicas existentes (`<section>` "Dados nefrológicos" e `<section>` "Situação")
num bloco condicional. Ou seja, troque:

```tsx
      <section className="rounded bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Dados nefrológicos</h2>
```

por:

```tsx
      {podeVerClinico && (
      <section className="rounded bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Dados nefrológicos</h2>
```

e feche o parêntese logo APÓS o fechamento da `<section>` de "Situação" (a que contém a tabela de
`mudancasSituacao`). Isto é, ache o `</section>` que fecha a seção de Situação e, imediatamente após
ele, adicione `)}`. Também troque o parágrafo final:

```tsx
      <p className="text-xs text-slate-400">
        Acessos e sorologias, medicações, alergias e evoluções chegam nas próximas entregas.
      </p>
```

por (aparece só para quem vê clínico; recepção não precisa desse aviso):

```tsx
      {podeVerClinico && (
        <p className="text-xs text-slate-400">
          Evoluções chegam na próxima entrega.
        </p>
      )}
```

- [ ] **Step 4: Verificação e commit**

Run: `npm test && npm run build`
Esperado: testes passando; build compila.

```bash
git add -A
git commit -m "feat: leitura clinica separada; recepcao nao ve conteudo clinico"
```

---

### Task 3: Serviço de acessos vasculares (TDD)

**Files:**
- Create: `src/lib/pacientes/acessos.ts`
- Modify: `tests/ajuda.ts` (limpeza)
- Test: `tests/acessos.test.ts`

- [ ] **Step 1: Limpeza no helper**

Em `tests/ajuda.ts`, dentro de `limparBanco`, ANTES de `db.paciente.deleteMany()`, acrescente:

```ts
  await db.acessoVascular.deleteMany();
  await db.sorologia.deleteMany();
  await db.medicacao.deleteMany();
  await db.alergia.deleteMany();
```

- [ ] **Step 2: Testes (devem falhar)** — crie `tests/acessos.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { registrarAcesso, marcarAcessoPerdido, listarAcessos } from "@/lib/pacientes/acessos";
import { criarPaciente } from "@/lib/pacientes/servico";
import { criarUsuarioTeste, limparBanco } from "./ajuda";

const PACIENTE = {
  nome: "Ana Souza", cpf: "529.982.247-25",
  dataNascimento: new Date("1960-05-10"), sexo: "FEMININO" as const, tipoVinculo: "SUS" as const,
};

async function pacienteEautor() {
  const autor = await criarUsuarioTeste({ perfil: "MEDICO", email: "m@clinica.local" });
  const criado = await criarPaciente(PACIENTE, autor.id);
  if (!criado.ok) throw new Error("falhou ao criar paciente");
  return { autor, pacienteId: criado.id };
}

describe("acessos vasculares", () => {
  beforeEach(limparBanco);

  it("registra acesso em uso e audita", async () => {
    const { autor, pacienteId } = await pacienteEautor();
    const r = await registrarAcesso(
      { pacienteId, tipo: "FISTULA", localizacao: "MSE radiocefálica", dataConfeccao: new Date("2020-01-10") },
      autor.id,
    );
    expect(r.ok).toBe(true);
    const acessos = await listarAcessos(pacienteId);
    expect(acessos).toHaveLength(1);
    expect(acessos[0].situacao).toBe("EM_USO");
  });

  it("rejeita localização vazia", async () => {
    const { autor, pacienteId } = await pacienteEautor();
    const r = await registrarAcesso(
      { pacienteId, tipo: "CATETER", localizacao: "  ", dataConfeccao: new Date("2021-05-01") },
      autor.id,
    );
    expect(r).toEqual({ ok: false, erro: "Informe a localização do acesso." });
  });

  it("marca acesso como perdido e audita", async () => {
    const { autor, pacienteId } = await pacienteEautor();
    const criado = await registrarAcesso(
      { pacienteId, tipo: "FISTULA", localizacao: "MSD", dataConfeccao: new Date("2019-03-01") },
      autor.id,
    );
    if (!criado.ok) throw new Error("falhou");
    const r = await marcarAcessoPerdido(criado.id, autor.id);
    expect(r.ok).toBe(true);
    const acessos = await listarAcessos(pacienteId);
    expect(acessos[0].situacao).toBe("PERDIDO");
  });

  it("lista acessos do mais novo para o mais antigo", async () => {
    const { autor, pacienteId } = await pacienteEautor();
    await registrarAcesso({ pacienteId, tipo: "CATETER", localizacao: "Jugular", dataConfeccao: new Date("2018-01-01") }, autor.id);
    await registrarAcesso({ pacienteId, tipo: "FISTULA", localizacao: "MSE", dataConfeccao: new Date("2022-01-01") }, autor.id);
    const acessos = await listarAcessos(pacienteId);
    expect(acessos.map((a) => a.localizacao)).toEqual(["MSE", "Jugular"]);
  });
});
```

Run: `npm test -- acessos` → Esperado: FAIL (módulo não existe).

- [ ] **Step 3: Implementar** — crie `src/lib/pacientes/acessos.ts`:

```ts
import { db } from "@/lib/db";
import { registrarEvento } from "@/lib/auditoria";
import type { AcessoVascular, TipoAcesso } from "@prisma/client";

export type ResultadoAcesso = { ok: true; id: string } | { ok: false; erro: string };

export async function registrarAcesso(
  dados: { pacienteId: string; tipo: TipoAcesso; localizacao: string; dataConfeccao: Date; observacao?: string },
  autorId: string,
): Promise<ResultadoAcesso> {
  if (!dados.localizacao.trim()) return { ok: false, erro: "Informe a localização do acesso." };

  const acesso = await db.acessoVascular.create({
    data: {
      pacienteId: dados.pacienteId,
      tipo: dados.tipo,
      localizacao: dados.localizacao.trim(),
      dataConfeccao: dados.dataConfeccao,
      observacao: dados.observacao?.trim() || null,
    },
  });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.acesso.registrar",
    entidade: "AcessoVascular",
    entidadeId: acesso.id,
    detalhes: { pacienteId: dados.pacienteId, tipo: dados.tipo },
  });
  return { ok: true, id: acesso.id };
}

export async function marcarAcessoPerdido(acessoId: string, autorId: string): Promise<ResultadoAcesso> {
  const acesso = await db.acessoVascular.findUnique({ where: { id: acessoId } });
  if (!acesso) return { ok: false, erro: "Acesso não encontrado." };

  await db.acessoVascular.update({ where: { id: acessoId }, data: { situacao: "PERDIDO" } });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.acesso.perder",
    entidade: "AcessoVascular",
    entidadeId: acessoId,
    detalhes: { pacienteId: acesso.pacienteId },
  });
  return { ok: true, id: acessoId };
}

export function listarAcessos(pacienteId: string): Promise<AcessoVascular[]> {
  return db.acessoVascular.findMany({
    where: { pacienteId },
    orderBy: { dataConfeccao: "desc" },
  });
}
```

Run: `npm test -- acessos` → Esperado: 4 testes passando.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: servico de acessos vasculares"
```

---

### Task 4: Serviço de sorologias (TDD)

**Files:**
- Create: `src/lib/pacientes/sorologias.ts`
- Test: `tests/sorologias.test.ts`

- [ ] **Step 1: Testes (devem falhar)** — crie `tests/sorologias.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { registrarSorologia, sorologiasAtuais } from "@/lib/pacientes/sorologias";
import { criarPaciente } from "@/lib/pacientes/servico";
import { criarUsuarioTeste, limparBanco } from "./ajuda";

const PACIENTE = {
  nome: "Ana Souza", cpf: "529.982.247-25",
  dataNascimento: new Date("1960-05-10"), sexo: "FEMININO" as const, tipoVinculo: "SUS" as const,
};

async function pacienteEautor() {
  const autor = await criarUsuarioTeste({ perfil: "ENFERMAGEM", email: "e@clinica.local" });
  const criado = await criarPaciente(PACIENTE, autor.id);
  if (!criado.ok) throw new Error("falhou");
  return { autor, pacienteId: criado.id };
}

describe("sorologias", () => {
  beforeEach(limparBanco);

  it("registra sorologia e audita", async () => {
    const { autor, pacienteId } = await pacienteEautor();
    const r = await registrarSorologia(
      { pacienteId, tipo: "HBSAG", resultado: "NEGATIVO", dataExame: new Date("2024-01-15") },
      autor.id,
    );
    expect(r.ok).toBe(true);
  });

  it("sorologiasAtuais devolve o resultado mais recente de cada tipo", async () => {
    const { autor, pacienteId } = await pacienteEautor();
    await registrarSorologia({ pacienteId, tipo: "ANTI_HCV", resultado: "NEGATIVO", dataExame: new Date("2023-01-01") }, autor.id);
    await registrarSorologia({ pacienteId, tipo: "ANTI_HCV", resultado: "POSITIVO", dataExame: new Date("2024-06-01") }, autor.id);
    await registrarSorologia({ pacienteId, tipo: "HIV", resultado: "NEGATIVO", dataExame: new Date("2024-06-01") }, autor.id);

    const atuais = await sorologiasAtuais(pacienteId);
    expect(atuais.ANTI_HCV?.resultado).toBe("POSITIVO"); // o mais recente vence
    expect(atuais.HIV?.resultado).toBe("NEGATIVO");
    expect(atuais.HBSAG).toBeUndefined(); // nunca registrada
  });
});
```

Run: `npm test -- sorologias` → Esperado: FAIL.

- [ ] **Step 2: Implementar** — crie `src/lib/pacientes/sorologias.ts`:

```ts
import { db } from "@/lib/db";
import { registrarEvento } from "@/lib/auditoria";
import type { Sorologia, TipoSorologia, ResultadoSorologia } from "@prisma/client";

export type ResultadoSorologiaOp = { ok: true; id: string } | { ok: false; erro: string };

export async function registrarSorologia(
  dados: { pacienteId: string; tipo: TipoSorologia; resultado: ResultadoSorologia; dataExame: Date },
  autorId: string,
): Promise<ResultadoSorologiaOp> {
  const sorologia = await db.sorologia.create({
    data: {
      pacienteId: dados.pacienteId,
      tipo: dados.tipo,
      resultado: dados.resultado,
      dataExame: dados.dataExame,
    },
  });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.sorologia.registrar",
    entidade: "Sorologia",
    entidadeId: sorologia.id,
    detalhes: { pacienteId: dados.pacienteId, tipo: dados.tipo, resultado: dados.resultado },
  });
  return { ok: true, id: sorologia.id };
}

// Devolve, por tipo, a sorologia mais recente (por data do exame). Chave = TipoSorologia.
export async function sorologiasAtuais(
  pacienteId: string,
): Promise<Partial<Record<TipoSorologia, Sorologia>>> {
  const todas = await db.sorologia.findMany({
    where: { pacienteId },
    orderBy: { dataExame: "desc" },
  });
  const atuais: Partial<Record<TipoSorologia, Sorologia>> = {};
  for (const s of todas) {
    if (!atuais[s.tipo]) atuais[s.tipo] = s; // a primeira de cada tipo é a mais recente
  }
  return atuais;
}
```

Run: `npm test -- sorologias` → Esperado: 2 testes passando.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: servico de sorologias com resultado atual por tipo"
```

---

### Task 5: Serviço de medicações e alergias (TDD)

**Files:**
- Create: `src/lib/pacientes/medicacoes.ts`
- Test: `tests/medicacoes.test.ts`

- [ ] **Step 1: Testes (devem falhar)** — crie `tests/medicacoes.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  adicionarMedicacao, suspenderMedicacao, medicacoesAtivas,
  adicionarAlergia, removerAlergia, listarAlergias,
} from "@/lib/pacientes/medicacoes";
import { criarPaciente } from "@/lib/pacientes/servico";
import { criarUsuarioTeste, limparBanco } from "./ajuda";

const PACIENTE = {
  nome: "Ana Souza", cpf: "529.982.247-25",
  dataNascimento: new Date("1960-05-10"), sexo: "FEMININO" as const, tipoVinculo: "SUS" as const,
};

async function pacienteEautor() {
  const autor = await criarUsuarioTeste({ perfil: "MEDICO", email: "m@clinica.local" });
  const criado = await criarPaciente(PACIENTE, autor.id);
  if (!criado.ok) throw new Error("falhou");
  return { autor, pacienteId: criado.id };
}

describe("medicações", () => {
  beforeEach(limparBanco);

  it("adiciona medicação ativa e audita", async () => {
    const { autor, pacienteId } = await pacienteEautor();
    const r = await adicionarMedicacao({ pacienteId, nome: "Losartana", dose: "50mg", posologia: "1x/dia" }, autor.id);
    expect(r.ok).toBe(true);
    const ativas = await medicacoesAtivas(pacienteId);
    expect(ativas).toHaveLength(1);
    expect(ativas[0].nome).toBe("Losartana");
  });

  it("rejeita nome de medicação vazio", async () => {
    const { autor, pacienteId } = await pacienteEautor();
    const r = await adicionarMedicacao({ pacienteId, nome: "  " }, autor.id);
    expect(r).toEqual({ ok: false, erro: "Informe o nome da medicação." });
  });

  it("suspender remove da lista de ativas mas mantém o registro", async () => {
    const { autor, pacienteId } = await pacienteEautor();
    const criada = await adicionarMedicacao({ pacienteId, nome: "Sevelamer" }, autor.id);
    if (!criada.ok) throw new Error("falhou");
    await suspenderMedicacao(criada.id, autor.id);
    expect(await medicacoesAtivas(pacienteId)).toHaveLength(0);
  });
});

describe("alergias", () => {
  beforeEach(limparBanco);

  it("adiciona e lista alergia", async () => {
    const { autor, pacienteId } = await pacienteEautor();
    const r = await adicionarAlergia({ pacienteId, descricao: "Penicilina" }, autor.id);
    expect(r.ok).toBe(true);
    const alergias = await listarAlergias(pacienteId);
    expect(alergias).toHaveLength(1);
    expect(alergias[0].descricao).toBe("Penicilina");
  });

  it("rejeita descrição vazia", async () => {
    const { autor, pacienteId } = await pacienteEautor();
    const r = await adicionarAlergia({ pacienteId, descricao: " " }, autor.id);
    expect(r).toEqual({ ok: false, erro: "Descreva a alergia." });
  });

  it("remove alergia", async () => {
    const { autor, pacienteId } = await pacienteEautor();
    const criada = await adicionarAlergia({ pacienteId, descricao: "Contraste iodado" }, autor.id);
    if (!criada.ok) throw new Error("falhou");
    await removerAlergia(criada.id, autor.id);
    expect(await listarAlergias(pacienteId)).toHaveLength(0);
  });
});
```

Run: `npm test -- medicacoes` → Esperado: FAIL.

- [ ] **Step 2: Implementar** — crie `src/lib/pacientes/medicacoes.ts`:

```ts
import { db } from "@/lib/db";
import { registrarEvento } from "@/lib/auditoria";
import type { Medicacao, Alergia } from "@prisma/client";

export type ResultadoClinico = { ok: true; id: string } | { ok: false; erro: string };

export async function adicionarMedicacao(
  dados: { pacienteId: string; nome: string; dose?: string; posologia?: string },
  autorId: string,
): Promise<ResultadoClinico> {
  if (!dados.nome.trim()) return { ok: false, erro: "Informe o nome da medicação." };

  const medicacao = await db.medicacao.create({
    data: {
      pacienteId: dados.pacienteId,
      nome: dados.nome.trim(),
      dose: dados.dose?.trim() || null,
      posologia: dados.posologia?.trim() || null,
    },
  });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.medicacao.adicionar",
    entidade: "Medicacao",
    entidadeId: medicacao.id,
    detalhes: { pacienteId: dados.pacienteId },
  });
  return { ok: true, id: medicacao.id };
}

export async function suspenderMedicacao(medicacaoId: string, autorId: string): Promise<ResultadoClinico> {
  const medicacao = await db.medicacao.findUnique({ where: { id: medicacaoId } });
  if (!medicacao) return { ok: false, erro: "Medicação não encontrada." };

  await db.medicacao.update({
    where: { id: medicacaoId },
    data: { ativa: false, suspensaEm: new Date() },
  });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.medicacao.suspender",
    entidade: "Medicacao",
    entidadeId: medicacaoId,
    detalhes: { pacienteId: medicacao.pacienteId },
  });
  return { ok: true, id: medicacaoId };
}

export function medicacoesAtivas(pacienteId: string): Promise<Medicacao[]> {
  return db.medicacao.findMany({
    where: { pacienteId, ativa: true },
    orderBy: { nome: "asc" },
  });
}

export async function adicionarAlergia(
  dados: { pacienteId: string; descricao: string },
  autorId: string,
): Promise<ResultadoClinico> {
  if (!dados.descricao.trim()) return { ok: false, erro: "Descreva a alergia." };

  const alergia = await db.alergia.create({
    data: { pacienteId: dados.pacienteId, descricao: dados.descricao.trim() },
  });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.alergia.adicionar",
    entidade: "Alergia",
    entidadeId: alergia.id,
    detalhes: { pacienteId: dados.pacienteId },
  });
  return { ok: true, id: alergia.id };
}

export async function removerAlergia(alergiaId: string, autorId: string): Promise<ResultadoClinico> {
  const alergia = await db.alergia.findUnique({ where: { id: alergiaId } });
  if (!alergia) return { ok: false, erro: "Alergia não encontrada." };

  await db.alergia.delete({ where: { id: alergiaId } });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.alergia.remover",
    entidade: "Alergia",
    entidadeId: alergiaId,
    detalhes: { pacienteId: alergia.pacienteId },
  });
  return { ok: true, id: alergiaId };
}

export function listarAlergias(pacienteId: string): Promise<Alergia[]> {
  return db.alergia.findMany({ where: { pacienteId }, orderBy: { criadoEm: "asc" } });
}
```

Run: `npm test -- medicacoes` → Esperado: 6 testes passando.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: servico de medicacoes e alergias"
```

---

### Task 6: Montagem do resumo do paciente (TDD)

**Files:**
- Create: `src/lib/pacientes/resumo.ts`
- Test: `tests/resumo.test.ts`

- [ ] **Step 1: Testes (devem falhar)** — crie `tests/resumo.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { montarResumo } from "@/lib/pacientes/resumo";
import { criarPaciente } from "@/lib/pacientes/servico";
import { registrarAcesso, marcarAcessoPerdido } from "@/lib/pacientes/acessos";
import { registrarSorologia } from "@/lib/pacientes/sorologias";
import { adicionarMedicacao, adicionarAlergia } from "@/lib/pacientes/medicacoes";
import { criarUsuarioTeste, limparBanco } from "./ajuda";

const PACIENTE = {
  nome: "Ana Souza", cpf: "529.982.247-25",
  dataNascimento: new Date("1960-05-10"), sexo: "FEMININO" as const, tipoVinculo: "SUS" as const,
};

describe("resumo do paciente", () => {
  beforeEach(limparBanco);

  it("devolve null quando o paciente não existe", async () => {
    expect(await montarResumo("nao-existe")).toBeNull();
  });

  it("reúne acesso atual, sorologias, medicações ativas e alergias", async () => {
    const autor = await criarUsuarioTeste({ perfil: "MEDICO", email: "m@clinica.local" });
    const criado = await criarPaciente(PACIENTE, autor.id);
    if (!criado.ok) throw new Error("falhou");
    const id = criado.id;

    const antigo = await registrarAcesso({ pacienteId: id, tipo: "CATETER", localizacao: "Jugular", dataConfeccao: new Date("2019-01-01") }, autor.id);
    if (!antigo.ok) throw new Error("falhou");
    await marcarAcessoPerdido(antigo.id, autor.id);
    await registrarAcesso({ pacienteId: id, tipo: "FISTULA", localizacao: "MSE radiocefálica", dataConfeccao: new Date("2022-01-01") }, autor.id);

    await registrarSorologia({ pacienteId: id, tipo: "HBSAG", resultado: "NEGATIVO", dataExame: new Date("2024-01-01") }, autor.id);
    await adicionarMedicacao({ pacienteId: id, nome: "Losartana", dose: "50mg" }, autor.id);
    await adicionarAlergia({ pacienteId: id, descricao: "Penicilina" }, autor.id);

    const resumo = await montarResumo(id);
    expect(resumo).not.toBeNull();
    expect(resumo!.paciente.nome).toBe("Ana Souza");
    expect(resumo!.acessoAtual?.localizacao).toBe("MSE radiocefálica"); // o EM_USO mais recente
    expect(resumo!.sorologias.HBSAG?.resultado).toBe("NEGATIVO");
    expect(resumo!.medicacoesAtivas).toHaveLength(1);
    expect(resumo!.alergias).toHaveLength(1);
  });

  it("acessoAtual é null quando todos os acessos foram perdidos", async () => {
    const autor = await criarUsuarioTeste({ perfil: "MEDICO", email: "m@clinica.local" });
    const criado = await criarPaciente(PACIENTE, autor.id);
    if (!criado.ok) throw new Error("falhou");
    const acesso = await registrarAcesso({ pacienteId: criado.id, tipo: "FISTULA", localizacao: "MSD", dataConfeccao: new Date("2020-01-01") }, autor.id);
    if (!acesso.ok) throw new Error("falhou");
    await marcarAcessoPerdido(acesso.id, autor.id);
    const resumo = await montarResumo(criado.id);
    expect(resumo!.acessoAtual).toBeNull();
  });
});
```

Run: `npm test -- resumo` → Esperado: FAIL.

- [ ] **Step 2: Implementar** — crie `src/lib/pacientes/resumo.ts`:

```ts
import { db } from "@/lib/db";
import { sorologiasAtuais } from "./sorologias";
import { medicacoesAtivas } from "./medicacoes";
import { listarAlergias } from "./medicacoes";
import type { AcessoVascular, Alergia, Medicacao, Paciente, Sorologia, TipoSorologia } from "@prisma/client";

export type Resumo = {
  paciente: Paciente;
  acessoAtual: AcessoVascular | null;
  sorologias: Partial<Record<TipoSorologia, Sorologia>>;
  medicacoesAtivas: Medicacao[];
  alergias: Alergia[];
};

export async function montarResumo(pacienteId: string): Promise<Resumo | null> {
  const paciente = await db.paciente.findUnique({ where: { id: pacienteId } });
  if (!paciente) return null;

  const acessoAtual = await db.acessoVascular.findFirst({
    where: { pacienteId, situacao: "EM_USO" },
    orderBy: { dataConfeccao: "desc" },
  });

  const [sorologias, ativas, alergias] = await Promise.all([
    sorologiasAtuais(pacienteId),
    medicacoesAtivas(pacienteId),
    listarAlergias(pacienteId),
  ]);

  return { paciente, acessoAtual, sorologias, medicacoesAtivas: ativas, alergias };
}
```

Run: `npm test -- resumo` → Esperado: 3 testes passando.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: montagem do resumo do paciente"
```

---

### Task 7: Filtros clínicos na busca (TDD)

**Files:**
- Modify: `src/lib/pacientes/busca.ts`
- Test: `tests/busca-clinica.test.ts`

- [ ] **Step 1: Testes (devem falhar)** — crie `tests/busca-clinica.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { buscarPacientes } from "@/lib/pacientes/busca";
import { criarPaciente } from "@/lib/pacientes/servico";
import { registrarAcesso } from "@/lib/pacientes/acessos";
import { registrarSorologia } from "@/lib/pacientes/sorologias";
import { criarUsuarioTeste, limparBanco } from "./ajuda";

describe("busca com filtros clínicos", () => {
  beforeEach(limparBanco);

  it("filtra por sorologia positiva de um tipo", async () => {
    const autor = await criarUsuarioTeste({ perfil: "MEDICO", email: "m@clinica.local" });
    const a = await criarPaciente({ nome: "Positivo HCV", cpf: "529.982.247-25", dataNascimento: new Date("1960-01-01"), sexo: "FEMININO", tipoVinculo: "SUS" }, autor.id);
    const b = await criarPaciente({ nome: "Negativo", cpf: "168.995.350-09", dataNascimento: new Date("1970-01-01"), sexo: "MASCULINO", tipoVinculo: "SUS" }, autor.id);
    if (!a.ok || !b.ok) throw new Error("falhou");
    await registrarSorologia({ pacienteId: a.id, tipo: "ANTI_HCV", resultado: "POSITIVO", dataExame: new Date("2024-01-01") }, autor.id);
    await registrarSorologia({ pacienteId: b.id, tipo: "ANTI_HCV", resultado: "NEGATIVO", dataExame: new Date("2024-01-01") }, autor.id);

    const encontrados = await buscarPacientes({ sorologiaPositiva: "ANTI_HCV" });
    expect(encontrados.map((p) => p.nome)).toEqual(["Positivo HCV"]);
  });

  it("usa a sorologia mais recente: negativou deixa de aparecer como positivo", async () => {
    const autor = await criarUsuarioTeste({ perfil: "MEDICO", email: "m@clinica.local" });
    const a = await criarPaciente({ nome: "Tratado", cpf: "529.982.247-25", dataNascimento: new Date("1960-01-01"), sexo: "FEMININO", tipoVinculo: "SUS" }, autor.id);
    if (!a.ok) throw new Error("falhou");
    await registrarSorologia({ pacienteId: a.id, tipo: "ANTI_HCV", resultado: "POSITIVO", dataExame: new Date("2022-01-01") }, autor.id);
    await registrarSorologia({ pacienteId: a.id, tipo: "ANTI_HCV", resultado: "NEGATIVO", dataExame: new Date("2024-01-01") }, autor.id);
    expect(await buscarPacientes({ sorologiaPositiva: "ANTI_HCV" })).toHaveLength(0);
  });

  it("filtra por tipo de acesso em uso", async () => {
    const autor = await criarUsuarioTeste({ perfil: "MEDICO", email: "m@clinica.local" });
    const a = await criarPaciente({ nome: "Com fístula", cpf: "529.982.247-25", dataNascimento: new Date("1960-01-01"), sexo: "FEMININO", tipoVinculo: "SUS" }, autor.id);
    const b = await criarPaciente({ nome: "Com cateter", cpf: "168.995.350-09", dataNascimento: new Date("1970-01-01"), sexo: "MASCULINO", tipoVinculo: "SUS" }, autor.id);
    if (!a.ok || !b.ok) throw new Error("falhou");
    await registrarAcesso({ pacienteId: a.id, tipo: "FISTULA", localizacao: "MSE", dataConfeccao: new Date("2022-01-01") }, autor.id);
    await registrarAcesso({ pacienteId: b.id, tipo: "CATETER", localizacao: "Jugular", dataConfeccao: new Date("2023-01-01") }, autor.id);

    const encontrados = await buscarPacientes({ tipoAcesso: "FISTULA" });
    expect(encontrados.map((p) => p.nome)).toEqual(["Com fístula"]);
  });
});
```

Run: `npm test -- busca-clinica` → Esperado: FAIL.

- [ ] **Step 2: Estender a busca**

Em `src/lib/pacientes/busca.ts`, troque o tipo `FiltrosPaciente` e a montagem das condições. O import
de tipos passa a incluir os novos enums:

```ts
import type {
  Modalidade, Paciente, Prisma, SituacaoPaciente, TipoVinculo, TipoSorologia, TipoAcesso,
} from "@prisma/client";
```

Atualize o tipo:

```ts
export type FiltrosPaciente = {
  texto?: string;
  situacao?: SituacaoPaciente;
  modalidade?: Modalidade;
  tipoVinculo?: TipoVinculo;
  sorologiaPositiva?: TipoSorologia;
  tipoAcesso?: TipoAcesso;
};
```

Logo ANTES do `return db.paciente.findMany(...)`, acrescente as condições clínicas. Como sorologia
"positiva atual" e "acesso em uso" dependem do registro mais recente, resolvemos os ids elegíveis
antes e filtramos por `id in [...]`:

```ts
  if (filtros.sorologiaPositiva) {
    const ultimas = await db.sorologia.findMany({
      where: { tipo: filtros.sorologiaPositiva },
      orderBy: { dataExame: "desc" },
    });
    const maisRecentePorPaciente = new Map<string, string>(); // pacienteId -> resultado
    for (const s of ultimas) {
      if (!maisRecentePorPaciente.has(s.pacienteId)) maisRecentePorPaciente.set(s.pacienteId, s.resultado);
    }
    const positivos = [...maisRecentePorPaciente.entries()]
      .filter(([, resultado]) => resultado === "POSITIVO")
      .map(([pacienteId]) => pacienteId);
    condicoes.push({ id: { in: positivos } });
  }

  if (filtros.tipoAcesso) {
    const comAcesso = await db.acessoVascular.findMany({
      where: { tipo: filtros.tipoAcesso, situacao: "EM_USO" },
      select: { pacienteId: true },
    });
    condicoes.push({ id: { in: comAcesso.map((a) => a.pacienteId) } });
  }
```

Run: `npm test -- busca-clinica` → Esperado: 3 testes passando. Rode também `npm test -- pacientes-busca` (7 testes seguem passando).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: filtros de sorologia positiva e tipo de acesso na busca"
```

---

### Task 8: Seções clínicas na ficha (acessos, sorologias, medicações, alergias)

**Files:**
- Create: `src/app/(app)/pacientes/[id]/secao-acessos.tsx`, `secao-sorologias.tsx`, `secao-medicacoes-alergias.tsx`
- Modify: `src/app/(app)/pacientes/acoes.ts` (novas actions), `src/app/(app)/pacientes/[id]/page.tsx` (renderizar seções)

- [ ] **Step 1: Novas server actions**

Em `src/app/(app)/pacientes/acoes.ts`, acrescente os imports dos serviços clínicos e novas actions.
Acrescente ao topo (junto dos imports existentes):

```ts
import { registrarAcesso, marcarAcessoPerdido } from "@/lib/pacientes/acessos";
import { registrarSorologia } from "@/lib/pacientes/sorologias";
import {
  adicionarMedicacao, suspenderMedicacao, adicionarAlergia, removerAlergia,
} from "@/lib/pacientes/medicacoes";
import type { TipoAcesso, TipoSorologia, ResultadoSorologia } from "@prisma/client";
```

Acrescente ao final do arquivo:

```ts
export async function acaoRegistrarAcesso(_anterior: EstadoPaciente, formData: FormData): Promise<EstadoPaciente> {
  const autor = await exigirPerfil(...PERFIS_CLINICO_PACIENTE);
  const pacienteId = String(formData.get("pacienteId") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const dataConfeccao = data(formData, "dataConfeccao");
  if (!["FISTULA", "CATETER", "PROTESE"].includes(tipo)) return { erro: "Tipo de acesso inválido." };
  if (!dataConfeccao) return { erro: "Informe a data de confecção/implante." };

  const r = await registrarAcesso(
    {
      pacienteId,
      tipo: tipo as TipoAcesso,
      localizacao: String(formData.get("localizacao") ?? ""),
      dataConfeccao,
      observacao: texto(formData, "observacao"),
    },
    autor.id,
  );
  if (!r.ok) return { erro: r.erro };
  revalidatePath(`/pacientes/${pacienteId}`);
  return undefined;
}

export async function acaoPerderAcesso(formData: FormData): Promise<void> {
  const autor = await exigirPerfil(...PERFIS_CLINICO_PACIENTE);
  await marcarAcessoPerdido(String(formData.get("acessoId") ?? ""), autor.id);
  revalidatePath(`/pacientes/${String(formData.get("pacienteId") ?? "")}`);
}

export async function acaoRegistrarSorologia(_anterior: EstadoPaciente, formData: FormData): Promise<EstadoPaciente> {
  const autor = await exigirPerfil(...PERFIS_CLINICO_PACIENTE);
  const pacienteId = String(formData.get("pacienteId") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const resultado = String(formData.get("resultado") ?? "");
  const dataExame = data(formData, "dataExame");
  if (!["HBSAG", "ANTI_HCV", "HIV"].includes(tipo)) return { erro: "Tipo de sorologia inválido." };
  if (!["POSITIVO", "NEGATIVO", "INDETERMINADO"].includes(resultado)) return { erro: "Resultado inválido." };
  if (!dataExame) return { erro: "Informe a data do exame." };

  const r = await registrarSorologia(
    { pacienteId, tipo: tipo as TipoSorologia, resultado: resultado as ResultadoSorologia, dataExame },
    autor.id,
  );
  if (!r.ok) return { erro: r.erro };
  revalidatePath(`/pacientes/${pacienteId}`);
  return undefined;
}

export async function acaoAdicionarMedicacao(_anterior: EstadoPaciente, formData: FormData): Promise<EstadoPaciente> {
  const autor = await exigirPerfil(...PERFIS_CLINICO_PACIENTE);
  const pacienteId = String(formData.get("pacienteId") ?? "");
  const r = await adicionarMedicacao(
    {
      pacienteId,
      nome: String(formData.get("nome") ?? ""),
      dose: texto(formData, "dose"),
      posologia: texto(formData, "posologia"),
    },
    autor.id,
  );
  if (!r.ok) return { erro: r.erro };
  revalidatePath(`/pacientes/${pacienteId}`);
  return undefined;
}

export async function acaoSuspenderMedicacao(formData: FormData): Promise<void> {
  const autor = await exigirPerfil(...PERFIS_CLINICO_PACIENTE);
  await suspenderMedicacao(String(formData.get("medicacaoId") ?? ""), autor.id);
  revalidatePath(`/pacientes/${String(formData.get("pacienteId") ?? "")}`);
}

export async function acaoAdicionarAlergia(_anterior: EstadoPaciente, formData: FormData): Promise<EstadoPaciente> {
  const autor = await exigirPerfil(...PERFIS_CLINICO_PACIENTE);
  const pacienteId = String(formData.get("pacienteId") ?? "");
  const r = await adicionarAlergia({ pacienteId, descricao: String(formData.get("descricao") ?? "") }, autor.id);
  if (!r.ok) return { erro: r.erro };
  revalidatePath(`/pacientes/${pacienteId}`);
  return undefined;
}

export async function acaoRemoverAlergia(formData: FormData): Promise<void> {
  const autor = await exigirPerfil(...PERFIS_CLINICO_PACIENTE);
  await removerAlergia(String(formData.get("alergiaId") ?? ""), autor.id);
  revalidatePath(`/pacientes/${String(formData.get("pacienteId") ?? "")}`);
}
```

- [ ] **Step 2: Componente de acessos** — crie `src/app/(app)/pacientes/[id]/secao-acessos.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { acaoRegistrarAcesso, acaoPerderAcesso } from "../acoes";
import type { AcessoVascular, TipoAcesso, SituacaoAcesso } from "@prisma/client";

const CAMPO = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm";
const ROTULO = "block text-sm font-medium text-slate-700";

const ROTULO_TIPO: Record<TipoAcesso, string> = {
  FISTULA: "Fístula",
  CATETER: "Cateter",
  PROTESE: "Prótese",
};
const ROTULO_SIT: Record<SituacaoAcesso, string> = { EM_USO: "Em uso", PERDIDO: "Perdido" };

function formatarData(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function SecaoAcessos({
  pacienteId,
  acessos,
  podeEditar,
}: {
  pacienteId: string;
  acessos: AcessoVascular[];
  podeEditar: boolean;
}) {
  const [estado, acao, pendente] = useActionState(acaoRegistrarAcesso, undefined);
  return (
    <section className="rounded bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Acessos vasculares</h2>
      {acessos.length > 0 ? (
        <table className="mb-4 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="py-2">Tipo</th>
              <th className="py-2">Localização</th>
              <th className="py-2">Confecção</th>
              <th className="py-2">Situação</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {acessos.map((a) => (
              <tr key={a.id} className="border-b">
                <td className="py-2">{ROTULO_TIPO[a.tipo]}</td>
                <td className="py-2">{a.localizacao}</td>
                <td className="py-2">{formatarData(a.dataConfeccao)}</td>
                <td className="py-2">
                  {a.situacao === "EM_USO" ? (
                    <span className="font-medium text-green-700">{ROTULO_SIT[a.situacao]}</span>
                  ) : (
                    <span className="text-slate-500">{ROTULO_SIT[a.situacao]}</span>
                  )}
                </td>
                <td className="py-2 text-right">
                  {podeEditar && a.situacao === "EM_USO" && (
                    <form action={acaoPerderAcesso}>
                      <input type="hidden" name="acessoId" value={a.id} />
                      <input type="hidden" name="pacienteId" value={pacienteId} />
                      <button className="text-red-600 hover:underline">Marcar perdido</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mb-4 text-sm text-slate-500">Nenhum acesso registrado.</p>
      )}

      {podeEditar && (
        <form action={acao} className="grid gap-3 sm:grid-cols-4">
          <div>
            <label htmlFor="tipo" className={ROTULO}>Tipo</label>
            <select id="tipo" name="tipo" className={CAMPO}>
              <option value="FISTULA">Fístula</option>
              <option value="CATETER">Cateter</option>
              <option value="PROTESE">Prótese</option>
            </select>
          </div>
          <div>
            <label htmlFor="localizacao" className={ROTULO}>Localização</label>
            <input id="localizacao" name="localizacao" required className={CAMPO} />
          </div>
          <div>
            <label htmlFor="dataConfeccao" className={ROTULO}>Confecção/implante</label>
            <input id="dataConfeccao" name="dataConfeccao" type="date" required className={CAMPO} />
          </div>
          <input type="hidden" name="pacienteId" value={pacienteId} />
          <div className="flex items-end">
            <button
              type="submit" disabled={pendente}
              className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {pendente ? "Salvando..." : "Adicionar"}
            </button>
          </div>
          {estado?.erro && <p className="text-sm text-red-600 sm:col-span-4">{estado.erro}</p>}
        </form>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Componente de sorologias** — crie `src/app/(app)/pacientes/[id]/secao-sorologias.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { acaoRegistrarSorologia } from "../acoes";
import type { Sorologia, TipoSorologia, ResultadoSorologia } from "@prisma/client";

const CAMPO = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm";
const ROTULO = "block text-sm font-medium text-slate-700";

const ROTULO_TIPO: Record<TipoSorologia, string> = {
  HBSAG: "HBsAg",
  ANTI_HCV: "Anti-HCV",
  HIV: "HIV",
};
const ROTULO_RES: Record<ResultadoSorologia, string> = {
  POSITIVO: "Positivo",
  NEGATIVO: "Negativo",
  INDETERMINADO: "Indeterminado",
};

function formatarData(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function SecaoSorologias({
  pacienteId,
  atuais,
  podeEditar,
}: {
  pacienteId: string;
  atuais: Partial<Record<TipoSorologia, Sorologia>>;
  podeEditar: boolean;
}) {
  const [estado, acao, pendente] = useActionState(acaoRegistrarSorologia, undefined);
  const tipos: TipoSorologia[] = ["HBSAG", "ANTI_HCV", "HIV"];
  return (
    <section className="rounded bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Sorologias</h2>
      <dl className="mb-4 grid gap-3 text-sm sm:grid-cols-3">
        {tipos.map((tipo) => {
          const s = atuais[tipo];
          return (
            <div key={tipo}>
              <dt className="text-slate-500">{ROTULO_TIPO[tipo]}</dt>
              <dd>
                {s ? (
                  <span className={s.resultado === "POSITIVO" ? "font-semibold text-red-700" : ""}>
                    {ROTULO_RES[s.resultado]} <span className="text-slate-400">({formatarData(s.dataExame)})</span>
                  </span>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      {podeEditar && (
        <form action={acao} className="grid gap-3 sm:grid-cols-4">
          <div>
            <label htmlFor="stipo" className={ROTULO}>Tipo</label>
            <select id="stipo" name="tipo" className={CAMPO}>
              <option value="HBSAG">HBsAg</option>
              <option value="ANTI_HCV">Anti-HCV</option>
              <option value="HIV">HIV</option>
            </select>
          </div>
          <div>
            <label htmlFor="resultado" className={ROTULO}>Resultado</label>
            <select id="resultado" name="resultado" className={CAMPO}>
              <option value="NEGATIVO">Negativo</option>
              <option value="POSITIVO">Positivo</option>
              <option value="INDETERMINADO">Indeterminado</option>
            </select>
          </div>
          <div>
            <label htmlFor="dataExame" className={ROTULO}>Data do exame</label>
            <input id="dataExame" name="dataExame" type="date" required className={CAMPO} />
          </div>
          <input type="hidden" name="pacienteId" value={pacienteId} />
          <div className="flex items-end">
            <button
              type="submit" disabled={pendente}
              className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {pendente ? "Salvando..." : "Registrar"}
            </button>
          </div>
          {estado?.erro && <p className="text-sm text-red-600 sm:col-span-4">{estado.erro}</p>}
        </form>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Componente de medicações e alergias** — crie `src/app/(app)/pacientes/[id]/secao-medicacoes-alergias.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import {
  acaoAdicionarMedicacao, acaoSuspenderMedicacao, acaoAdicionarAlergia, acaoRemoverAlergia,
} from "../acoes";
import type { Medicacao, Alergia } from "@prisma/client";

const CAMPO = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm";
const ROTULO = "block text-sm font-medium text-slate-700";

export function SecaoMedicacoesAlergias({
  pacienteId,
  medicacoes,
  alergias,
  podeEditar,
}: {
  pacienteId: string;
  medicacoes: Medicacao[];
  alergias: Alergia[];
  podeEditar: boolean;
}) {
  const [estMed, acaoMed, pendMed] = useActionState(acaoAdicionarMedicacao, undefined);
  const [estAlg, acaoAlg, pendAlg] = useActionState(acaoAdicionarAlergia, undefined);
  return (
    <section className="grid gap-6 sm:grid-cols-2">
      <div className="rounded bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Medicações em uso</h2>
        {medicacoes.length > 0 ? (
          <ul className="mb-4 space-y-1 text-sm">
            {medicacoes.map((m) => (
              <li key={m.id} className="flex items-center justify-between border-b py-1">
                <span>{m.nome}{m.dose ? ` ${m.dose}` : ""}{m.posologia ? ` — ${m.posologia}` : ""}</span>
                {podeEditar && (
                  <form action={acaoSuspenderMedicacao}>
                    <input type="hidden" name="medicacaoId" value={m.id} />
                    <input type="hidden" name="pacienteId" value={pacienteId} />
                    <button className="text-xs text-red-600 hover:underline">Suspender</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-slate-500">Nenhuma medicação ativa.</p>
        )}
        {podeEditar && (
          <form action={acaoMed} className="space-y-2">
            <div>
              <label htmlFor="nome" className={ROTULO}>Medicação</label>
              <input id="nome" name="nome" required className={CAMPO} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input name="dose" placeholder="Dose (ex.: 50mg)" className={CAMPO} />
              <input name="posologia" placeholder="Posologia (ex.: 1x/dia)" className={CAMPO} />
            </div>
            <input type="hidden" name="pacienteId" value={pacienteId} />
            {estMed?.erro && <p className="text-sm text-red-600">{estMed.erro}</p>}
            <button
              type="submit" disabled={pendMed}
              className="rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {pendMed ? "Salvando..." : "Adicionar medicação"}
            </button>
          </form>
        )}
      </div>

      <div className="rounded bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Alergias</h2>
        {alergias.length > 0 ? (
          <ul className="mb-4 space-y-1 text-sm">
            {alergias.map((a) => (
              <li key={a.id} className="flex items-center justify-between border-b py-1">
                <span>{a.descricao}</span>
                {podeEditar && (
                  <form action={acaoRemoverAlergia}>
                    <input type="hidden" name="alergiaId" value={a.id} />
                    <input type="hidden" name="pacienteId" value={pacienteId} />
                    <button className="text-xs text-red-600 hover:underline">Remover</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-slate-500">Nenhuma alergia registrada.</p>
        )}
        {podeEditar && (
          <form action={acaoAlg} className="space-y-2">
            <div>
              <label htmlFor="descricao" className={ROTULO}>Alergia</label>
              <input id="descricao" name="descricao" required className={CAMPO} />
            </div>
            <input type="hidden" name="pacienteId" value={pacienteId} />
            {estAlg?.erro && <p className="text-sm text-red-600">{estAlg.erro}</p>}
            <button
              type="submit" disabled={pendAlg}
              className="rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {pendAlg ? "Salvando..." : "Adicionar alergia"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Renderizar as seções na ficha**

Em `src/app/(app)/pacientes/[id]/page.tsx`:

(a) Acrescente aos imports:

```ts
import Link from "next/link";
import { listarAcessos } from "@/lib/pacientes/acessos";
import { sorologiasAtuais } from "@/lib/pacientes/sorologias";
import { medicacoesAtivas, listarAlergias } from "@/lib/pacientes/medicacoes";
import { SecaoAcessos } from "./secao-acessos";
import { SecaoSorologias } from "./secao-sorologias";
import { SecaoMedicacoesAlergias } from "./secao-medicacoes-alergias";
```

(Se `Link` já estiver importado, não duplique.)

(b) Depois de buscar o `paciente` e registrar a visualização, e SÓ quando `podeVerClinico`, carregue
os dados clínicos. Logo após a linha `const podeVerClinico = ...`, acrescente:

```ts
  const [acessos, sorologias, medicacoes, alergias] = podeVerClinico
    ? await Promise.all([
        listarAcessos(paciente.id),
        sorologiasAtuais(paciente.id),
        medicacoesAtivas(paciente.id),
        listarAlergias(paciente.id),
      ])
    : [[], {}, [], []];
```

(c) No topo do JSX, logo abaixo do bloco `<div>` do cabeçalho do paciente, adicione um link para o
resumo (só para quem vê clínico):

```tsx
      {podeVerClinico && (
        <Link href={`/pacientes/${paciente.id}/resumo`} className="inline-block text-sm text-blue-700 hover:underline">
          Ver resumo do paciente →
        </Link>
      )}
```

(d) Dentro do bloco `{podeVerClinico && ( ... )}` que envolve as seções clínicas, APÓS a seção de
"Situação", adicione as três novas seções:

```tsx
      <SecaoAcessos pacienteId={paciente.id} acessos={acessos} podeEditar={podeEditarClinico} />
      <SecaoSorologias pacienteId={paciente.id} atuais={sorologias} podeEditar={podeEditarClinico} />
      <SecaoMedicacoesAlergias pacienteId={paciente.id} medicacoes={medicacoes} alergias={alergias} podeEditar={podeEditarClinico} />
```

- [ ] **Step 6: Verificação e commit**

Run: `npm test && npm run build`
Esperado: testes passando; build compila com `ƒ /pacientes/[id]`.

```bash
git add -A
git commit -m "feat: secoes clinicas na ficha do paciente"
```

---

### Task 9: Tela de resumo do paciente

**Files:**
- Create: `src/app/(app)/pacientes/[id]/resumo/page.tsx`

- [ ] **Step 1: Página de resumo**

```tsx
// src/app/(app)/pacientes/[id]/resumo/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_CLINICO_LEITURA } from "@/lib/pacientes/permissoes";
import { montarResumo } from "@/lib/pacientes/resumo";
import { formatarCpf } from "@/lib/pacientes/documentos";
import { registrarEvento } from "@/lib/auditoria";
import type { Modalidade, ResultadoSorologia, SituacaoPaciente, TipoAcesso, TipoSorologia } from "@prisma/client";

const ROTULO_SITUACAO: Record<SituacaoPaciente, string> = {
  ATIVO: "Ativo", TRANSPLANTADO: "Transplantado", OBITO: "Óbito",
  TRANSFERIDO: "Transferido", EM_TRANSITO: "Em trânsito",
};
const ROTULO_MODALIDADE: Record<Modalidade, string> = {
  HEMODIALISE: "Hemodiálise", DIALISE_PERITONEAL: "Diálise peritoneal",
};
const ROTULO_ACESSO: Record<TipoAcesso, string> = { FISTULA: "Fístula", CATETER: "Cateter", PROTESE: "Prótese" };
const ROTULO_SOROLOGIA: Record<TipoSorologia, string> = { HBSAG: "HBsAg", ANTI_HCV: "Anti-HCV", HIV: "HIV" };
const ROTULO_RESULTADO: Record<ResultadoSorologia, string> = {
  POSITIVO: "Positivo", NEGATIVO: "Negativo", INDETERMINADO: "Indeterminado",
};

function dataUTC(data: Date | null): string {
  if (!data) return "—";
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export default async function PaginaResumo({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirPerfil(...PERFIS_CLINICO_LEITURA);
  const { id } = await params;

  const resumo = await montarResumo(id);
  if (!resumo) notFound();

  await registrarEvento({
    usuarioId: usuario.id,
    acao: "paciente.resumo.visualizar",
    entidade: "Paciente",
    entidadeId: id,
  });

  const { paciente, acessoAtual, sorologias, medicacoesAtivas, alergias } = resumo;
  const tipos: TipoSorologia[] = ["HBSAG", "ANTI_HCV", "HIV"];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href={`/pacientes/${paciente.id}`} className="text-sm text-blue-700 hover:underline">← Ficha completa</Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-800">{paciente.nome}</h1>
        <p className="text-sm text-slate-500">
          {formatarCpf(paciente.cpf)} · {dataUTC(paciente.dataNascimento)} ·{" "}
          <span className="font-medium">{ROTULO_SITUACAO[paciente.situacao]}</span>
          {paciente.modalidade ? ` · ${ROTULO_MODALIDADE[paciente.modalidade]}` : ""}
        </p>
      </div>

      {alergias.length > 0 && (
        <div className="rounded border border-red-200 bg-red-50 p-4">
          <h2 className="text-sm font-semibold text-red-800">Alergias</h2>
          <p className="text-sm text-red-700">{alergias.map((a) => a.descricao).join(" · ")}</p>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="rounded bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Acesso atual</h2>
          {acessoAtual ? (
            <p className="text-sm">
              <span className="font-medium">{ROTULO_ACESSO[acessoAtual.tipo]}</span> — {acessoAtual.localizacao}
              <span className="text-slate-400"> (desde {dataUTC(acessoAtual.dataConfeccao)})</span>
            </p>
          ) : (
            <p className="text-sm text-amber-700">Sem acesso em uso registrado.</p>
          )}
        </section>

        <section className="rounded bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Sorologias</h2>
          <ul className="text-sm">
            {tipos.map((tipo) => {
              const s = sorologias[tipo];
              return (
                <li key={tipo} className="flex justify-between">
                  <span className="text-slate-500">{ROTULO_SOROLOGIA[tipo]}</span>
                  <span className={s?.resultado === "POSITIVO" ? "font-semibold text-red-700" : ""}>
                    {s ? ROTULO_RESULTADO[s.resultado] : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="rounded bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Medicações em uso</h2>
        {medicacoesAtivas.length > 0 ? (
          <ul className="text-sm">
            {medicacoesAtivas.map((m) => (
              <li key={m.id}>{m.nome}{m.dose ? ` ${m.dose}` : ""}{m.posologia ? ` — ${m.posologia}` : ""}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Nenhuma medicação ativa.</p>
        )}
      </section>

      <section className="rounded bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Últimas evoluções</h2>
        <p className="text-sm text-slate-400">As evoluções chegam na próxima entrega.</p>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Link do resumo na lista de pacientes** (atalho útil)

Em `src/app/(app)/pacientes/page.tsx`, isso é opcional e pode ser pulado — o acesso ao resumo já
existe pela ficha. Não altere a lista nesta tarefa.

- [ ] **Step 3: Verificação e commit**

Run: `npm test && npm run build`
Esperado: build compila com `ƒ /pacientes/[id]/resumo`.

```bash
git add -A
git commit -m "feat: tela de resumo do paciente"
```

---

### Task 10: Dados clínicos na base demo + verificação final

**Files:**
- Modify: `prisma/seed-demo.ts`, `README.md`

- [ ] **Step 1: Acrescentar dados clínicos ao seed demo**

Em `prisma/seed-demo.ts`, o loop atual cria só pacientes. Substitua a função `main` para também
semear acessos, sorologias, medicações e alergias em alguns pacientes. Troque o corpo de `main`
por:

```ts
async function main() {
  let criados = 0;
  const idPorCpf = new Map<string, string>();
  for (const p of PACIENTES) {
    const existente = await db.paciente.findUnique({ where: { cpf: p.cpf } });
    if (existente) {
      idPorCpf.set(p.cpf, existente.id);
      continue;
    }
    const novo = await db.paciente.create({ data: p });
    idPorCpf.set(p.cpf, novo.id);
    criados++;
  }

  // Dados clínicos apenas para pacientes recém-criados (idempotente: só quando criou tudo do zero)
  if (criados > 0) {
    const maria = idPorCpf.get("52998224725")!;
    const joao = idPorCpf.get("16899535009")!;
    const antonia = idPorCpf.get("23844285865")!;

    await db.acessoVascular.create({
      data: { pacienteId: maria, tipo: "FISTULA", localizacao: "MSE radiocefálica", dataConfeccao: new Date("2019-06-01") },
    });
    await db.acessoVascular.create({
      data: { pacienteId: joao, tipo: "CATETER", localizacao: "Jugular direita", dataConfeccao: new Date("2021-02-10") },
    });

    await db.sorologia.createMany({
      data: [
        { pacienteId: maria, tipo: "HBSAG", resultado: "NEGATIVO", dataExame: new Date("2024-01-10") },
        { pacienteId: maria, tipo: "ANTI_HCV", resultado: "NEGATIVO", dataExame: new Date("2024-01-10") },
        { pacienteId: maria, tipo: "HIV", resultado: "NEGATIVO", dataExame: new Date("2024-01-10") },
        { pacienteId: joao, tipo: "ANTI_HCV", resultado: "POSITIVO", dataExame: new Date("2023-08-01") },
      ],
    });

    await db.medicacao.createMany({
      data: [
        { pacienteId: maria, nome: "Losartana", dose: "50mg", posologia: "1x/dia" },
        { pacienteId: maria, nome: "Sevelamer", dose: "800mg", posologia: "3x/dia às refeições" },
        { pacienteId: joao, nome: "Eritropoetina", dose: "4000UI", posologia: "3x/semana" },
      ],
    });

    await db.alergia.create({ data: { pacienteId: antonia, descricao: "Penicilina" } });
  }

  const total = await db.paciente.count();
  console.log(`Demo: ${criados} paciente(s) criado(s). Total no banco: ${total}.`);
}
```

- [ ] **Step 2: Recarregar a demo** (limpe antes para repovoar com dados clínicos)

Como o seed só cria dados clínicos para pacientes novos, e os 10 já existem do plano anterior, para
ver os dados clínicos na demo é preciso limpar os pacientes demo antes. Rode este comando único:

Run: `npx prisma db execute --stdin` com o SQL abaixo (ou, se preferir, apague os 10 pacientes demo
pelo painel). Cole no stdin:

```sql
DELETE FROM "Paciente" WHERE cpf IN
('52998224725','16899535009','23844285865','35524040073','88764842053',
 '63017285057','40442820135','70830792856','24985721042','45317828791');
```

Depois: `npm run seed:demo`
Esperado: `Demo: 10 paciente(s) criado(s). Total no banco: 10.` e sem erros.

- [ ] **Step 3: Documentar no README**

Em `README.md`, na seção que fala do `seed:demo`, acrescente a frase:

```markdown
A demo inclui acessos, sorologias, medicações e alergias em alguns pacientes, para exercitar a
tela de resumo e os filtros clínicos.
```

- [ ] **Step 4: Verificação completa**

Run: `npm run lint && npm test && npm run build`
Esperado: lint limpo, todos os testes passando, build ok.

Rotas esperadas: as da Entrega 2 mais `ƒ /pacientes/[id]/resumo`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: dados clinicos na base demo e README atualizado"
```

---

## Checklist manual (controlador)

1. Como **recepção**: abrir a ficha de um paciente → só aparece Identificação e vínculo; **nenhuma** seção clínica, nenhum link de resumo.
2. Como **médico**: a ficha mostra dados nefrológicos, acessos, sorologias, medicações e alergias, todos editáveis; há link "Ver resumo".
3. Como **técnico**: vê as seções clínicas em leitura, sem formulários de edição.
4. Registrar uma fístula em uso, depois marcá-la perdida; o resumo mostra "sem acesso em uso" só quando não há nenhum EM_USO.
5. Registrar Anti-HCV positivo e depois negativo com data mais recente; o resumo mostra Negativo e o filtro "Anti-HCV positivo" na busca não traz o paciente.
6. Resumo do João (demo) mostra Anti-HCV **Positivo** em vermelho e o acesso cateter atual.
7. Alergia aparece em destaque vermelho no topo do resumo.
8. Auditoria (admin) registra `paciente.acesso.registrar`, `paciente.sorologia.registrar`, `paciente.resumo.visualizar` etc.

## Fora do escopo (entregas seguintes)

- **Entrega 4:** evoluções com templates, assinatura e adendos (o resumo já reserva o espaço).
- **Entrega 5:** foto, documentos anexados, PDF do prontuário, exportação para Excel.
