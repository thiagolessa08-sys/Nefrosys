# Fase 1 — Entrega 2: Cadastro de Pacientes — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cadastrar, buscar e manter pacientes de nefrologia — identificação, vínculo assistencial e dados nefrológicos com histórico de situação — mais uma base demo de pacientes fictícios para navegar o sistema.

**Architecture:** Segue os padrões da Entrega 1: regras de negócio em `src/lib/pacientes/` como funções testáveis retornando resultado discriminado (`{ok:true,id}` | `{ok:false,erro}`); páginas e server actions são camada fina que chamam `exigirPerfil` no servidor; toda leitura e alteração de dado de paciente é auditada via `registrarEvento`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Prisma 6, PostgreSQL (Railway), Vitest, Tailwind v4.

**Base:** Entrega 1 concluída — auth com 6 perfis, sessões, trilha de auditoria, gestão de usuários.

---

## Decisões de escopo desta entrega

- **Foto do paciente fica para a Entrega 5** — é upload de arquivo e depende da decisão de armazenamento (disco do Railway é efêmero). Não resolver duas vezes.
- **CPF e CNS validados por dígito verificador**, não só formato. Dado inválido aqui só apareceria no faturamento (Fase 4), tarde demais.
- **Recepção cadastra identificação e vínculo, mas não dados clínicos** (CID, modalidade, situação) — o spec define que Recepção não acessa conteúdo clínico. O paciente nasce sem dados nefrológicos; médico/enfermagem completam.
- **Administrador não acessa pacientes** — o spec separa gestão de assistência.
- **Exportação para Excel fica na Entrega 5** (junto das demais exportações).
- **Filtros de sorologia e tipo de acesso ficam na Entrega 3** (esses dados só existem lá).

## Matriz de permissões desta entrega

| Ação | Perfis |
|------|--------|
| Ver lista e ficha de paciente | Recepção, Médico, Enfermagem, Técnico, Multiprofissional |
| Criar paciente / editar identificação e vínculo | Recepção, Médico, Enfermagem |
| Editar dados nefrológicos / mudar situação | Médico, Enfermagem |
| Qualquer acesso a paciente | **Administrador: negado** |

## Estrutura de arquivos ao final da entrega

```
prisma/schema.prisma            # + enums Sexo/TipoVinculo/Modalidade/SituacaoPaciente, Paciente, MudancaSituacao
prisma/seed-demo.ts             # carga de pacientes fictícios (CPF/CNS gerados válidos)
src/lib/pacientes/
  documentos.ts                 # cpfValido / cnsValido / apenasDigitos / formatarCpf
  permissoes.ts                 # listas de perfis por ação
  servico.ts                    # criarPaciente / atualizarIdentificacao / atualizarNefrologicos / mudarSituacao
  busca.ts                      # buscarPacientes (texto + filtros)
src/app/(app)/pacientes/
  page.tsx                      # lista com busca e filtros
  acoes.ts                      # server actions
  novo/page.tsx + formulario.tsx
  [id]/page.tsx                 # ficha do paciente
  [id]/formulario-identificacao.tsx
  [id]/formulario-nefrologicos.tsx
src/app/(app)/conta/
  page.tsx + formulario.tsx     # troca de senha pelo próprio usuário
  acoes.ts
src/lib/usuarios/servico.ts     # + alterarPropriaSenha
tests/
  documentos.test.ts / pacientes-servico.test.ts / pacientes-busca.test.ts /
  pacientes-permissoes.test.ts / conta-senha.test.ts
```

---

### Task 1: Esquema de Paciente e histórico de situação

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Acrescentar enums e modelos ao final do schema**

Acrescente ao final de `prisma/schema.prisma` (NÃO remova nada existente):

```prisma
enum Sexo {
  FEMININO
  MASCULINO
  OUTRO
}

enum TipoVinculo {
  SUS
  CONVENIO
}

enum Modalidade {
  HEMODIALISE
  DIALISE_PERITONEAL
}

enum SituacaoPaciente {
  ATIVO
  TRANSPLANTADO
  OBITO
  TRANSFERIDO
  EM_TRANSITO
}

model Paciente {
  id             String   @id @default(cuid())
  nome           String
  cpf            String   @unique
  cns            String?  @unique
  dataNascimento DateTime
  sexo           Sexo
  telefone       String?
  emailContato   String?

  logradouro  String?
  numero      String?
  complemento String?
  bairro      String?
  cidade      String?
  uf          String?
  cep         String?

  contatoEmergenciaNome     String?
  contatoEmergenciaTelefone String?

  tipoVinculo       TipoVinculo
  convenioNome      String?
  convenioMatricula String?
  convenioValidade  DateTime?

  cidDoencaBase     String?
  dataInicioDialise DateTime?
  modalidade        Modalidade?
  situacao          SituacaoPaciente @default(ATIVO)

  criadoEm     DateTime @default(now())
  atualizadoEm DateTime @updatedAt

  mudancasSituacao MudancaSituacao[]

  @@index([nome])
  @@index([situacao])
  @@index([modalidade])
}

model MudancaSituacao {
  id              String            @id @default(cuid())
  pacienteId      String
  de              SituacaoPaciente?
  para            SituacaoPaciente
  motivo          String?
  registradoPorId String?
  registradoEm    DateTime          @default(now())

  paciente Paciente @relation(fields: [pacienteId], references: [id], onDelete: Cascade)

  @@index([pacienteId])
}
```

- [ ] **Step 2: Gerar e aplicar a migração**

Run: `npx prisma migrate dev --name pacientes`
Esperado: migração criada em `prisma/migrations/` e aplicada; client regenerado.

- [ ] **Step 3: Rodar os testes**

Run: `npm test`
Esperado: 26 testes seguem passando (nenhum toca Paciente ainda).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: esquema de paciente e historico de situacao"
```

---

### Task 2: Validação de CPF e CNS (TDD)

**Files:**
- Create: `src/lib/pacientes/documentos.ts`
- Test: `tests/documentos.test.ts`

- [ ] **Step 1: Escrever os testes (devem falhar)**

```ts
// tests/documentos.test.ts
import { describe, it, expect } from "vitest";
import { apenasDigitos, cpfValido, cnsValido, formatarCpf } from "@/lib/pacientes/documentos";

describe("apenasDigitos", () => {
  it("remove pontuação", () => {
    expect(apenasDigitos("529.982.247-25")).toBe("52998224725");
  });
});

describe("cpfValido", () => {
  it("aceita CPF válido com e sem pontuação", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("52998224725")).toBe(true);
  });

  it("rejeita CPF com dígito verificador errado", () => {
    expect(cpfValido("52998224724")).toBe(false);
  });

  it("rejeita CPF com todos os dígitos iguais", () => {
    expect(cpfValido("11111111111")).toBe(false);
    expect(cpfValido("00000000000")).toBe(false);
  });

  it("rejeita tamanho diferente de 11", () => {
    expect(cpfValido("5299822472")).toBe(false);
    expect(cpfValido("")).toBe(false);
  });
});

describe("cnsValido", () => {
  it("aceita CNS válido (soma ponderada múltipla de 11)", () => {
    expect(cnsValido("144082627300006")).toBe(true);
  });

  it("rejeita CNS com checksum errado", () => {
    expect(cnsValido("144082627300005")).toBe(false);
  });

  it("rejeita tamanho diferente de 15", () => {
    expect(cnsValido("14408262730000")).toBe(false);
  });

  it("rejeita primeiro dígito inválido", () => {
    expect(cnsValido("344082627300004")).toBe(false);
  });
});

describe("formatarCpf", () => {
  it("formata com pontuação", () => {
    expect(formatarCpf("52998224725")).toBe("529.982.247-25");
  });
});
```

- [ ] **Step 2: Verificar que falham**

Run: `npm test -- documentos`
Esperado: FAIL — módulo `@/lib/pacientes/documentos` não existe.

- [ ] **Step 3: Implementar**

```ts
// src/lib/pacientes/documentos.ts

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

function digitoVerificadorCpf(digitos: string, pesoInicial: number): number {
  let soma = 0;
  for (let i = 0; i < digitos.length; i++) {
    soma += Number(digitos[i]) * (pesoInicial - i);
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cpfValido(valor: string): boolean {
  const d = apenasDigitos(valor);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false; // 111.111.111-11 passa no cálculo, mas não existe
  if (digitoVerificadorCpf(d.slice(0, 9), 10) !== Number(d[9])) return false;
  return digitoVerificadorCpf(d.slice(0, 10), 11) === Number(d[10]);
}

// CNS: soma dos 15 dígitos ponderados de 15 a 1 deve ser múltipla de 11.
// Primeiro dígito 1 ou 2 = CNS definitivo; 7, 8 ou 9 = provisório.
export function cnsValido(valor: string): boolean {
  const d = apenasDigitos(valor);
  if (d.length !== 15) return false;
  if (!/^[12789]/.test(d)) return false;
  let soma = 0;
  for (let i = 0; i < 15; i++) soma += Number(d[i]) * (15 - i);
  return soma % 11 === 0;
}

export function formatarCpf(valor: string): string {
  const d = apenasDigitos(valor);
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
```

- [ ] **Step 4: Verificar que passam**

Run: `npm test -- documentos`
Esperado: 10 testes passando.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: validacao de CPF e CNS por digito verificador"
```

---

### Task 3: Permissões de paciente (TDD)

**Files:**
- Create: `src/lib/pacientes/permissoes.ts`
- Test: `tests/pacientes-permissoes.test.ts`

- [ ] **Step 1: Escrever os testes (devem falhar)**

```ts
// tests/pacientes-permissoes.test.ts
import { describe, it, expect } from "vitest";
import { PERFIS_LEITURA_PACIENTE, PERFIS_CADASTRO_PACIENTE, PERFIS_CLINICO_PACIENTE } from "@/lib/pacientes/permissoes";

describe("permissoes de paciente", () => {
  it("administrador não acessa paciente em nenhuma lista", () => {
    expect(PERFIS_LEITURA_PACIENTE).not.toContain("ADMINISTRADOR");
    expect(PERFIS_CADASTRO_PACIENTE).not.toContain("ADMINISTRADOR");
    expect(PERFIS_CLINICO_PACIENTE).not.toContain("ADMINISTRADOR");
  });

  it("recepção lê e cadastra, mas não edita dado clínico", () => {
    expect(PERFIS_LEITURA_PACIENTE).toContain("RECEPCAO");
    expect(PERFIS_CADASTRO_PACIENTE).toContain("RECEPCAO");
    expect(PERFIS_CLINICO_PACIENTE).not.toContain("RECEPCAO");
  });

  it("técnico e multiprofissional só leem", () => {
    for (const perfil of ["TECNICO", "MULTIPROFISSIONAL"] as const) {
      expect(PERFIS_LEITURA_PACIENTE).toContain(perfil);
      expect(PERFIS_CADASTRO_PACIENTE).not.toContain(perfil);
      expect(PERFIS_CLINICO_PACIENTE).not.toContain(perfil);
    }
  });

  it("médico e enfermagem fazem tudo", () => {
    for (const perfil of ["MEDICO", "ENFERMAGEM"] as const) {
      expect(PERFIS_LEITURA_PACIENTE).toContain(perfil);
      expect(PERFIS_CADASTRO_PACIENTE).toContain(perfil);
      expect(PERFIS_CLINICO_PACIENTE).toContain(perfil);
    }
  });
});
```

- [ ] **Step 2: Verificar que falham**

Run: `npm test -- pacientes-permissoes`
Esperado: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```ts
// src/lib/pacientes/permissoes.ts
import type { Perfil } from "@prisma/client";

// Administrador fica de fora de propósito: o spec separa gestão de assistência.
export const PERFIS_LEITURA_PACIENTE: readonly Perfil[] = [
  "RECEPCAO",
  "MEDICO",
  "ENFERMAGEM",
  "TECNICO",
  "MULTIPROFISSIONAL",
];

export const PERFIS_CADASTRO_PACIENTE: readonly Perfil[] = ["RECEPCAO", "MEDICO", "ENFERMAGEM"];

export const PERFIS_CLINICO_PACIENTE: readonly Perfil[] = ["MEDICO", "ENFERMAGEM"];
```

- [ ] **Step 4: Verificar que passam**

Run: `npm test -- pacientes-permissoes`
Esperado: 4 testes passando.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: matriz de permissoes de paciente"
```

---

### Task 4: Serviço de pacientes — criar e atualizar (TDD)

**Files:**
- Create: `src/lib/pacientes/servico.ts`
- Modify: `tests/ajuda.ts` (acrescentar limpeza de Paciente)
- Test: `tests/pacientes-servico.test.ts`

- [ ] **Step 1: Acrescentar limpeza de paciente ao helper**

Em `tests/ajuda.ts`, dentro de `limparBanco`, ANTES de `db.usuario.deleteMany()`, acrescente:

```ts
  await db.mudancaSituacao.deleteMany();
  await db.paciente.deleteMany();
```

A função completa fica:

```ts
export async function limparBanco() {
  await db.sessao.deleteMany();
  await db.eventoAuditoria.deleteMany();
  await db.mudancaSituacao.deleteMany();
  await db.paciente.deleteMany();
  await db.usuario.deleteMany();
}
```

- [ ] **Step 2: Escrever os testes (devem falhar)**

```ts
// tests/pacientes-servico.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { criarPaciente, atualizarIdentificacao, atualizarNefrologicos, mudarSituacao } from "@/lib/pacientes/servico";
import { criarUsuarioTeste, limparBanco } from "./ajuda";
import { db } from "@/lib/db";

const DADOS_VALIDOS = {
  nome: "Maria da Silva",
  cpf: "529.982.247-25",
  cns: "144082627300006",
  dataNascimento: new Date("1960-05-10"),
  sexo: "FEMININO" as const,
  tipoVinculo: "SUS" as const,
};

describe("servico de pacientes", () => {
  beforeEach(limparBanco);

  it("cria paciente com CPF normalizado e audita", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "recep@clinica.local" });
    const resultado = await criarPaciente(DADOS_VALIDOS, autor.id);
    expect(resultado.ok).toBe(true);
    const paciente = await db.paciente.findFirst();
    expect(paciente?.cpf).toBe("52998224725"); // guardado sem pontuação
    expect(paciente?.situacao).toBe("ATIVO");
    const eventos = await db.eventoAuditoria.findMany({ where: { acao: "paciente.criar" } });
    expect(eventos).toHaveLength(1);
  });

  it("rejeita CPF inválido", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "recep@clinica.local" });
    const resultado = await criarPaciente({ ...DADOS_VALIDOS, cpf: "52998224724" }, autor.id);
    expect(resultado).toEqual({ ok: false, erro: "CPF inválido." });
  });

  it("rejeita CNS inválido", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "recep@clinica.local" });
    const resultado = await criarPaciente({ ...DADOS_VALIDOS, cns: "144082627300005" }, autor.id);
    expect(resultado).toEqual({ ok: false, erro: "CNS inválido." });
  });

  it("aceita paciente sem CNS", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "recep@clinica.local" });
    const resultado = await criarPaciente({ ...DADOS_VALIDOS, cns: undefined }, autor.id);
    expect(resultado.ok).toBe(true);
  });

  it("rejeita nome vazio", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "recep@clinica.local" });
    const resultado = await criarPaciente({ ...DADOS_VALIDOS, nome: "   " }, autor.id);
    expect(resultado).toEqual({ ok: false, erro: "Informe o nome." });
  });

  it("rejeita CPF duplicado", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "recep@clinica.local" });
    await criarPaciente(DADOS_VALIDOS, autor.id);
    const resultado = await criarPaciente({ ...DADOS_VALIDOS, cns: undefined }, autor.id);
    expect(resultado).toEqual({ ok: false, erro: "Já existe paciente com este CPF." });
  });

  it("exige convênio quando o vínculo é CONVENIO", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "recep@clinica.local" });
    const resultado = await criarPaciente(
      { ...DADOS_VALIDOS, tipoVinculo: "CONVENIO", convenioNome: "  " },
      autor.id,
    );
    expect(resultado).toEqual({ ok: false, erro: "Informe o nome do convênio." });
  });

  it("atualiza identificação e audita", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "recep@clinica.local" });
    const criado = await criarPaciente(DADOS_VALIDOS, autor.id);
    if (!criado.ok) throw new Error("falhou ao criar");
    const resultado = await atualizarIdentificacao(criado.id, { ...DADOS_VALIDOS, nome: "Maria Silva Souza" }, autor.id);
    expect(resultado.ok).toBe(true);
    const paciente = await db.paciente.findUnique({ where: { id: criado.id } });
    expect(paciente?.nome).toBe("Maria Silva Souza");
    const eventos = await db.eventoAuditoria.findMany({ where: { acao: "paciente.atualizar_identificacao" } });
    expect(eventos).toHaveLength(1);
  });

  it("atualiza dados nefrológicos e audita", async () => {
    const autor = await criarUsuarioTeste({ perfil: "MEDICO", email: "med@clinica.local" });
    const criado = await criarPaciente(DADOS_VALIDOS, autor.id);
    if (!criado.ok) throw new Error("falhou ao criar");
    const resultado = await atualizarNefrologicos(
      criado.id,
      { cidDoencaBase: "N18.5", dataInicioDialise: new Date("2020-03-01"), modalidade: "HEMODIALISE" },
      autor.id,
    );
    expect(resultado.ok).toBe(true);
    const paciente = await db.paciente.findUnique({ where: { id: criado.id } });
    expect(paciente?.modalidade).toBe("HEMODIALISE");
    expect(paciente?.cidDoencaBase).toBe("N18.5");
    const eventos = await db.eventoAuditoria.findMany({ where: { acao: "paciente.atualizar_nefrologicos" } });
    expect(eventos).toHaveLength(1);
  });

  it("muda situação registrando histórico com origem, destino e motivo", async () => {
    const autor = await criarUsuarioTeste({ perfil: "MEDICO", email: "med@clinica.local" });
    const criado = await criarPaciente(DADOS_VALIDOS, autor.id);
    if (!criado.ok) throw new Error("falhou ao criar");

    const resultado = await mudarSituacao(criado.id, "TRANSPLANTADO", "Transplante realizado no HC", autor.id);
    expect(resultado.ok).toBe(true);

    const paciente = await db.paciente.findUnique({ where: { id: criado.id } });
    expect(paciente?.situacao).toBe("TRANSPLANTADO");

    const historico = await db.mudancaSituacao.findMany({ where: { pacienteId: criado.id } });
    expect(historico).toHaveLength(1);
    expect(historico[0].de).toBe("ATIVO");
    expect(historico[0].para).toBe("TRANSPLANTADO");
    expect(historico[0].motivo).toBe("Transplante realizado no HC");
    expect(historico[0].registradoPorId).toBe(autor.id);
  });

  it("não registra histórico quando a situação não muda", async () => {
    const autor = await criarUsuarioTeste({ perfil: "MEDICO", email: "med@clinica.local" });
    const criado = await criarPaciente(DADOS_VALIDOS, autor.id);
    if (!criado.ok) throw new Error("falhou ao criar");
    const resultado = await mudarSituacao(criado.id, "ATIVO", "sem mudança", autor.id);
    expect(resultado).toEqual({ ok: false, erro: "O paciente já está nesta situação." });
    expect(await db.mudancaSituacao.count()).toBe(0);
  });
});
```

- [ ] **Step 3: Verificar que falham**

Run: `npm test -- pacientes-servico`
Esperado: FAIL — módulo `@/lib/pacientes/servico` não existe.

- [ ] **Step 4: Implementar**

```ts
// src/lib/pacientes/servico.ts
import { db } from "@/lib/db";
import { registrarEvento } from "@/lib/auditoria";
import { apenasDigitos, cpfValido, cnsValido } from "./documentos";
import type { Modalidade, Sexo, SituacaoPaciente, TipoVinculo } from "@prisma/client";

export type ResultadoPaciente = { ok: true; id: string } | { ok: false; erro: string };

export type DadosIdentificacao = {
  nome: string;
  cpf: string;
  cns?: string;
  dataNascimento: Date;
  sexo: Sexo;
  telefone?: string;
  emailContato?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  contatoEmergenciaNome?: string;
  contatoEmergenciaTelefone?: string;
  tipoVinculo: TipoVinculo;
  convenioNome?: string;
  convenioMatricula?: string;
  convenioValidade?: Date;
};

export type DadosNefrologicos = {
  cidDoencaBase?: string;
  dataInicioDialise?: Date;
  modalidade?: Modalidade;
};

function validarIdentificacao(dados: DadosIdentificacao): string | null {
  if (!dados.nome.trim()) return "Informe o nome.";
  if (!cpfValido(dados.cpf)) return "CPF inválido.";
  if (dados.cns && !cnsValido(dados.cns)) return "CNS inválido.";
  if (dados.tipoVinculo === "CONVENIO" && !dados.convenioNome?.trim())
    return "Informe o nome do convênio.";
  return null;
}

function camposIdentificacao(dados: DadosIdentificacao) {
  return {
    nome: dados.nome.trim(),
    cpf: apenasDigitos(dados.cpf),
    cns: dados.cns ? apenasDigitos(dados.cns) : null,
    dataNascimento: dados.dataNascimento,
    sexo: dados.sexo,
    telefone: dados.telefone?.trim() || null,
    emailContato: dados.emailContato?.trim().toLowerCase() || null,
    logradouro: dados.logradouro?.trim() || null,
    numero: dados.numero?.trim() || null,
    complemento: dados.complemento?.trim() || null,
    bairro: dados.bairro?.trim() || null,
    cidade: dados.cidade?.trim() || null,
    uf: dados.uf?.trim().toUpperCase() || null,
    cep: dados.cep ? apenasDigitos(dados.cep) : null,
    contatoEmergenciaNome: dados.contatoEmergenciaNome?.trim() || null,
    contatoEmergenciaTelefone: dados.contatoEmergenciaTelefone?.trim() || null,
    tipoVinculo: dados.tipoVinculo,
    convenioNome: dados.convenioNome?.trim() || null,
    convenioMatricula: dados.convenioMatricula?.trim() || null,
    convenioValidade: dados.convenioValidade ?? null,
  };
}

export async function criarPaciente(dados: DadosIdentificacao, autorId: string): Promise<ResultadoPaciente> {
  const erro = validarIdentificacao(dados);
  if (erro) return { ok: false, erro };

  const cpf = apenasDigitos(dados.cpf);
  if (await db.paciente.findUnique({ where: { cpf } }))
    return { ok: false, erro: "Já existe paciente com este CPF." };

  const cns = dados.cns ? apenasDigitos(dados.cns) : null;
  if (cns && (await db.paciente.findUnique({ where: { cns } })))
    return { ok: false, erro: "Já existe paciente com este CNS." };

  const paciente = await db.paciente.create({ data: camposIdentificacao(dados) });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.criar",
    entidade: "Paciente",
    entidadeId: paciente.id,
  });
  return { ok: true, id: paciente.id };
}

export async function atualizarIdentificacao(
  pacienteId: string,
  dados: DadosIdentificacao,
  autorId: string,
): Promise<ResultadoPaciente> {
  const erro = validarIdentificacao(dados);
  if (erro) return { ok: false, erro };

  const cpf = apenasDigitos(dados.cpf);
  const conflitoCpf = await db.paciente.findUnique({ where: { cpf } });
  if (conflitoCpf && conflitoCpf.id !== pacienteId)
    return { ok: false, erro: "Já existe paciente com este CPF." };

  const cns = dados.cns ? apenasDigitos(dados.cns) : null;
  if (cns) {
    const conflitoCns = await db.paciente.findUnique({ where: { cns } });
    if (conflitoCns && conflitoCns.id !== pacienteId)
      return { ok: false, erro: "Já existe paciente com este CNS." };
  }

  await db.paciente.update({ where: { id: pacienteId }, data: camposIdentificacao(dados) });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.atualizar_identificacao",
    entidade: "Paciente",
    entidadeId: pacienteId,
  });
  return { ok: true, id: pacienteId };
}

export async function atualizarNefrologicos(
  pacienteId: string,
  dados: DadosNefrologicos,
  autorId: string,
): Promise<ResultadoPaciente> {
  await db.paciente.update({
    where: { id: pacienteId },
    data: {
      cidDoencaBase: dados.cidDoencaBase?.trim().toUpperCase() || null,
      dataInicioDialise: dados.dataInicioDialise ?? null,
      modalidade: dados.modalidade ?? null,
    },
  });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.atualizar_nefrologicos",
    entidade: "Paciente",
    entidadeId: pacienteId,
  });
  return { ok: true, id: pacienteId };
}

export async function mudarSituacao(
  pacienteId: string,
  para: SituacaoPaciente,
  motivo: string | undefined,
  autorId: string,
): Promise<ResultadoPaciente> {
  const paciente = await db.paciente.findUnique({ where: { id: pacienteId } });
  if (!paciente) return { ok: false, erro: "Paciente não encontrado." };
  if (paciente.situacao === para) return { ok: false, erro: "O paciente já está nesta situação." };

  await db.paciente.update({ where: { id: pacienteId }, data: { situacao: para } });
  await db.mudancaSituacao.create({
    data: {
      pacienteId,
      de: paciente.situacao,
      para,
      motivo: motivo?.trim() || null,
      registradoPorId: autorId,
    },
  });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.mudar_situacao",
    entidade: "Paciente",
    entidadeId: pacienteId,
    detalhes: { de: paciente.situacao, para },
  });
  return { ok: true, id: pacienteId };
}
```

- [ ] **Step 5: Verificar que passam**

Run: `npm test -- pacientes-servico`
Esperado: 11 testes passando.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: servico de pacientes com validacao e historico de situacao"
```

---

### Task 5: Busca de pacientes com filtros (TDD)

**Files:**
- Create: `src/lib/pacientes/busca.ts`
- Test: `tests/pacientes-busca.test.ts`

- [ ] **Step 1: Escrever os testes (devem falhar)**

```ts
// tests/pacientes-busca.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { buscarPacientes } from "@/lib/pacientes/busca";
import { criarPaciente } from "@/lib/pacientes/servico";
import { criarUsuarioTeste, limparBanco } from "./ajuda";

async function semear(autorId: string) {
  await criarPaciente(
    {
      nome: "Ana Souza", cpf: "529.982.247-25", cns: "144082627300006",
      dataNascimento: new Date("1960-05-10"), sexo: "FEMININO", tipoVinculo: "SUS",
    },
    autorId,
  );
  await criarPaciente(
    {
      nome: "Bruno Lima", cpf: "168.995.350-09",
      dataNascimento: new Date("1975-02-20"), sexo: "MASCULINO",
      tipoVinculo: "CONVENIO", convenioNome: "Unimed",
    },
    autorId,
  );
}

describe("busca de pacientes", () => {
  beforeEach(limparBanco);

  it("lista todos ordenados por nome quando não há filtro", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "r@clinica.local" });
    await semear(autor.id);
    const encontrados = await buscarPacientes({});
    expect(encontrados.map((p) => p.nome)).toEqual(["Ana Souza", "Bruno Lima"]);
  });

  it("busca por parte do nome, sem diferenciar maiúsculas", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "r@clinica.local" });
    await semear(autor.id);
    const encontrados = await buscarPacientes({ texto: "bru" });
    expect(encontrados).toHaveLength(1);
    expect(encontrados[0].nome).toBe("Bruno Lima");
  });

  it("busca por CPF mesmo digitado com pontuação", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "r@clinica.local" });
    await semear(autor.id);
    const encontrados = await buscarPacientes({ texto: "529.982.247-25" });
    expect(encontrados).toHaveLength(1);
    expect(encontrados[0].nome).toBe("Ana Souza");
  });

  it("busca por CNS", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "r@clinica.local" });
    await semear(autor.id);
    const encontrados = await buscarPacientes({ texto: "144082627300006" });
    expect(encontrados).toHaveLength(1);
    expect(encontrados[0].nome).toBe("Ana Souza");
  });

  it("filtra por tipo de vínculo", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "r@clinica.local" });
    await semear(autor.id);
    const encontrados = await buscarPacientes({ tipoVinculo: "CONVENIO" });
    expect(encontrados).toHaveLength(1);
    expect(encontrados[0].nome).toBe("Bruno Lima");
  });

  it("filtra por situação", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "r@clinica.local" });
    await semear(autor.id);
    const ativos = await buscarPacientes({ situacao: "ATIVO" });
    expect(ativos).toHaveLength(2);
    const obitos = await buscarPacientes({ situacao: "OBITO" });
    expect(obitos).toHaveLength(0);
  });

  it("não retorna nada para texto sem correspondência", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "r@clinica.local" });
    await semear(autor.id);
    expect(await buscarPacientes({ texto: "zzzz" })).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Verificar que falham**

Run: `npm test -- pacientes-busca`
Esperado: FAIL — módulo `@/lib/pacientes/busca` não existe.

- [ ] **Step 3: Implementar**

```ts
// src/lib/pacientes/busca.ts
import { db } from "@/lib/db";
import { apenasDigitos } from "./documentos";
import type { Modalidade, Paciente, Prisma, SituacaoPaciente, TipoVinculo } from "@prisma/client";

export type FiltrosPaciente = {
  texto?: string;
  situacao?: SituacaoPaciente;
  modalidade?: Modalidade;
  tipoVinculo?: TipoVinculo;
};

export async function buscarPacientes(filtros: FiltrosPaciente): Promise<Paciente[]> {
  const condicoes: Prisma.PacienteWhereInput[] = [];

  const texto = filtros.texto?.trim();
  if (texto) {
    const digitos = apenasDigitos(texto);
    const alternativas: Prisma.PacienteWhereInput[] = [
      { nome: { contains: texto, mode: "insensitive" } },
    ];
    // só busca por documento quando o usuário digitou números
    if (digitos) {
      alternativas.push({ cpf: { contains: digitos } });
      alternativas.push({ cns: { contains: digitos } });
    }
    condicoes.push({ OR: alternativas });
  }

  if (filtros.situacao) condicoes.push({ situacao: filtros.situacao });
  if (filtros.modalidade) condicoes.push({ modalidade: filtros.modalidade });
  if (filtros.tipoVinculo) condicoes.push({ tipoVinculo: filtros.tipoVinculo });

  return db.paciente.findMany({
    where: condicoes.length ? { AND: condicoes } : undefined,
    orderBy: { nome: "asc" },
    take: 200,
  });
}
```

- [ ] **Step 4: Verificar que passam**

Run: `npm test -- pacientes-busca`
Esperado: 7 testes passando.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: busca de pacientes por texto e filtros"
```

---

### Task 6: Base demo de pacientes fictícios

**Files:**
- Create: `prisma/seed-demo.ts`
- Modify: `package.json` (script `seed:demo`)

- [ ] **Step 1: Criar o seed demo**

Os CPFs e CNS abaixo foram gerados pelo algoritmo de dígito verificador — são válidos para o
sistema e **não pertencem a nenhuma pessoa real**. Nomes e endereços são fictícios.

```ts
// prisma/seed-demo.ts
// Carga de pacientes FICTÍCIOS para desenvolvimento e demonstração.
// Nunca rode isto contra um banco com dados reais de pacientes.
import { PrismaClient, type Prisma } from "@prisma/client";

const db = new PrismaClient();

// Tipo explícito: sem ele o TS infere uma união (uns têm CNS, outros não) e o Prisma reclama.
const PACIENTES: Prisma.PacienteCreateInput[] = [
  {
    nome: "Maria Aparecida Ribeiro", cpf: "52998224725", cns: "144082627300006",
    dataNascimento: new Date("1958-03-12"), sexo: "FEMININO" as const,
    telefone: "(11) 98812-4400", bairro: "Santana", cidade: "São Paulo", uf: "SP",
    contatoEmergenciaNome: "José Ribeiro", contatoEmergenciaTelefone: "(11) 98812-4401",
    tipoVinculo: "SUS" as const,
    cidDoencaBase: "N18.5", dataInicioDialise: new Date("2019-06-03"),
    modalidade: "HEMODIALISE" as const, situacao: "ATIVO" as const,
  },
  {
    nome: "João Batista Nogueira", cpf: "16899535009", cns: "125869587950008",
    dataNascimento: new Date("1965-11-28"), sexo: "MASCULINO" as const,
    telefone: "(11) 99630-2210", bairro: "Tatuapé", cidade: "São Paulo", uf: "SP",
    contatoEmergenciaNome: "Cláudia Nogueira", contatoEmergenciaTelefone: "(11) 99630-2211",
    tipoVinculo: "CONVENIO" as const, convenioNome: "Unimed", convenioMatricula: "0099887766",
    convenioValidade: new Date("2027-12-31"),
    cidDoencaBase: "E11.2", dataInicioDialise: new Date("2021-02-15"),
    modalidade: "HEMODIALISE" as const, situacao: "ATIVO" as const,
  },
  {
    nome: "Antônia Ferreira Lima", cpf: "23844285865",
    dataNascimento: new Date("1972-07-04"), sexo: "FEMININO" as const,
    telefone: "(11) 97744-1180", bairro: "Ipiranga", cidade: "São Paulo", uf: "SP",
    tipoVinculo: "SUS" as const,
    cidDoencaBase: "I12.0", dataInicioDialise: new Date("2022-09-20"),
    modalidade: "DIALISE_PERITONEAL" as const, situacao: "ATIVO" as const,
  },
  {
    nome: "Carlos Eduardo Prado", cpf: "35524040073",
    dataNascimento: new Date("1949-01-19"), sexo: "MASCULINO" as const,
    telefone: "(11) 96521-7734", bairro: "Mooca", cidade: "São Paulo", uf: "SP",
    contatoEmergenciaNome: "Beatriz Prado", contatoEmergenciaTelefone: "(11) 96521-7735",
    tipoVinculo: "SUS" as const,
    cidDoencaBase: "N03.9", dataInicioDialise: new Date("2018-04-11"),
    modalidade: "HEMODIALISE" as const, situacao: "ATIVO" as const,
  },
  {
    nome: "Rosa Helena Martins", cpf: "88764842053",
    dataNascimento: new Date("1980-09-30"), sexo: "FEMININO" as const,
    telefone: "(11) 95410-8890", bairro: "Pinheiros", cidade: "São Paulo", uf: "SP",
    tipoVinculo: "CONVENIO" as const, convenioNome: "Bradesco Saúde", convenioMatricula: "1122334455",
    convenioValidade: new Date("2026-11-30"),
    cidDoencaBase: "N18.4", dataInicioDialise: new Date("2023-01-09"),
    modalidade: "HEMODIALISE" as const, situacao: "ATIVO" as const,
  },
  {
    nome: "Sebastião Alves da Costa", cpf: "63017285057",
    dataNascimento: new Date("1954-12-05"), sexo: "MASCULINO" as const,
    telefone: "(11) 94330-5567", bairro: "Penha", cidade: "São Paulo", uf: "SP",
    tipoVinculo: "SUS" as const,
    cidDoencaBase: "N18.5", dataInicioDialise: new Date("2017-08-22"),
    modalidade: "HEMODIALISE" as const, situacao: "TRANSPLANTADO" as const,
  },
  {
    nome: "Luzia Gomes de Andrade", cpf: "40442820135",
    dataNascimento: new Date("1968-06-17"), sexo: "FEMININO" as const,
    telefone: "(11) 93222-9901", bairro: "Butantã", cidade: "São Paulo", uf: "SP",
    tipoVinculo: "SUS" as const,
    cidDoencaBase: "E11.2", dataInicioDialise: new Date("2020-10-30"),
    modalidade: "DIALISE_PERITONEAL" as const, situacao: "ATIVO" as const,
  },
  {
    nome: "Paulo Roberto Siqueira", cpf: "70830792856",
    dataNascimento: new Date("1961-04-23"), sexo: "MASCULINO" as const,
    telefone: "(11) 92110-4432", bairro: "Lapa", cidade: "São Paulo", uf: "SP",
    tipoVinculo: "CONVENIO" as const, convenioNome: "SulAmérica", convenioMatricula: "5566778899",
    convenioValidade: new Date("2027-06-30"),
    cidDoencaBase: "I12.0", dataInicioDialise: new Date("2021-11-05"),
    modalidade: "HEMODIALISE" as const, situacao: "TRANSFERIDO" as const,
  },
  {
    nome: "Terezinha de Jesus Barros", cpf: "24985721042",
    dataNascimento: new Date("1945-08-08"), sexo: "FEMININO" as const,
    telefone: "(11) 91887-3320", bairro: "Vila Mariana", cidade: "São Paulo", uf: "SP",
    contatoEmergenciaNome: "Marcos Barros", contatoEmergenciaTelefone: "(11) 91887-3321",
    tipoVinculo: "SUS" as const,
    cidDoencaBase: "N18.5", dataInicioDialise: new Date("2016-02-14"),
    modalidade: "HEMODIALISE" as const, situacao: "OBITO" as const,
  },
  {
    nome: "Fernando Augusto Teixeira", cpf: "45317828791",
    dataNascimento: new Date("1988-02-11"), sexo: "MASCULINO" as const,
    telefone: "(11) 90554-6678", bairro: "Santo Amaro", cidade: "São Paulo", uf: "SP",
    tipoVinculo: "SUS" as const,
    cidDoencaBase: "N03.9", dataInicioDialise: new Date("2024-05-27"),
    modalidade: "HEMODIALISE" as const, situacao: "EM_TRANSITO" as const,
  },
];

async function main() {
  let criados = 0;
  for (const p of PACIENTES) {
    const existente = await db.paciente.findUnique({ where: { cpf: p.cpf } });
    if (existente) continue;
    await db.paciente.create({ data: p });
    criados++;
  }
  const total = await db.paciente.count();
  console.log(`Demo: ${criados} paciente(s) criado(s). Total no banco: ${total}.`);
}

main().finally(() => db.$disconnect());
```

- [ ] **Step 2: Adicionar o script**

Em `package.json`, dentro de `"scripts"`, acrescente:

```json
"seed:demo": "tsx prisma/seed-demo.ts"
```

- [ ] **Step 3: Rodar a carga**

Run: `npm run seed:demo`
Esperado: `Demo: 10 paciente(s) criado(s). Total no banco: 10.`

Rodar de novo deve dizer `Demo: 0 paciente(s) criado(s). Total no banco: 10.` (é idempotente).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: base demo com pacientes ficticios"
```

---

### Task 7: Lista de pacientes com busca e filtros

**Files:**
- Create: `src/app/(app)/pacientes/page.tsx`
- Modify: `src/app/(app)/layout.tsx` (link no menu)

- [ ] **Step 1: Página de lista**

```tsx
// src/app/(app)/pacientes/page.tsx
import Link from "next/link";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_LEITURA_PACIENTE, PERFIS_CADASTRO_PACIENTE } from "@/lib/pacientes/permissoes";
import { buscarPacientes } from "@/lib/pacientes/busca";
import { formatarCpf } from "@/lib/pacientes/documentos";
import { registrarEvento } from "@/lib/auditoria";
import { perfilPermitido } from "@/lib/perfis";
import type { Modalidade, SituacaoPaciente, TipoVinculo } from "@prisma/client";

const ROTULO_SITUACAO: Record<SituacaoPaciente, string> = {
  ATIVO: "Ativo",
  TRANSPLANTADO: "Transplantado",
  OBITO: "Óbito",
  TRANSFERIDO: "Transferido",
  EM_TRANSITO: "Em trânsito",
};

const ROTULO_MODALIDADE: Record<Modalidade, string> = {
  HEMODIALISE: "Hemodiálise",
  DIALISE_PERITONEAL: "Diálise peritoneal",
};

export default async function PaginaPacientes({
  searchParams,
}: {
  searchParams: Promise<{ texto?: string; situacao?: string; modalidade?: string; vinculo?: string }>;
}) {
  const usuario = await exigirPerfil(...PERFIS_LEITURA_PACIENTE);
  const params = await searchParams;

  const pacientes = await buscarPacientes({
    texto: params.texto,
    situacao: (params.situacao || undefined) as SituacaoPaciente | undefined,
    modalidade: (params.modalidade || undefined) as Modalidade | undefined,
    tipoVinculo: (params.vinculo || undefined) as TipoVinculo | undefined,
  });

  await registrarEvento({
    usuarioId: usuario.id,
    acao: "paciente.listar",
    detalhes: { filtros: params, resultados: pacientes.length },
  });

  const podeCadastrar = perfilPermitido(usuario.perfil, PERFIS_CADASTRO_PACIENTE);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Pacientes</h1>
        {podeCadastrar && (
          <Link href="/pacientes/novo" className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
            Novo paciente
          </Link>
        )}
      </div>

      <form className="mb-4 flex flex-wrap gap-2 rounded bg-white p-4 shadow-sm">
        <input
          name="texto" defaultValue={params.texto ?? ""} placeholder="Nome, CPF ou CNS"
          className="min-w-60 flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <select name="situacao" defaultValue={params.situacao ?? ""} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">Todas as situações</option>
          {Object.entries(ROTULO_SITUACAO).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>{rotulo}</option>
          ))}
        </select>
        <select name="modalidade" defaultValue={params.modalidade ?? ""} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">Todas as modalidades</option>
          {Object.entries(ROTULO_MODALIDADE).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>{rotulo}</option>
          ))}
        </select>
        <select name="vinculo" defaultValue={params.vinculo ?? ""} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">SUS e convênio</option>
          <option value="SUS">SUS</option>
          <option value="CONVENIO">Convênio</option>
        </select>
        <button className="rounded bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Buscar
        </button>
      </form>

      <p className="mb-2 text-sm text-slate-500">{pacientes.length} paciente(s) encontrado(s).</p>

      <table className="w-full rounded bg-white text-sm shadow-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="px-4 py-2">Nome</th>
            <th className="px-4 py-2">CPF</th>
            <th className="px-4 py-2">Modalidade</th>
            <th className="px-4 py-2">Vínculo</th>
            <th className="px-4 py-2">Situação</th>
          </tr>
        </thead>
        <tbody>
          {pacientes.map((paciente) => (
            <tr key={paciente.id} className="border-b">
              <td className="px-4 py-2">
                <Link href={`/pacientes/${paciente.id}`} className="text-blue-700 hover:underline">
                  {paciente.nome}
                </Link>
              </td>
              <td className="px-4 py-2">{formatarCpf(paciente.cpf)}</td>
              <td className="px-4 py-2">{paciente.modalidade ? ROTULO_MODALIDADE[paciente.modalidade] : "—"}</td>
              <td className="px-4 py-2">{paciente.tipoVinculo === "SUS" ? "SUS" : paciente.convenioNome ?? "Convênio"}</td>
              <td className="px-4 py-2">{ROTULO_SITUACAO[paciente.situacao]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Link no menu**

Em `src/app/(app)/layout.tsx`, o `<nav>` atual é:

```tsx
        <nav className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-slate-800">Nefrosys</Link>
          {ehAdmin && <Link href="/usuarios" className="text-sm text-slate-600 hover:underline">Usuários</Link>}
          {ehAdmin && <Link href="/auditoria" className="text-sm text-slate-600 hover:underline">Auditoria</Link>}
        </nav>
```

Substitua por (acrescenta Pacientes para quem tem leitura, e importa o necessário):

```tsx
        <nav className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-slate-800">Nefrosys</Link>
          {podeVerPacientes && <Link href="/pacientes" className="text-sm text-slate-600 hover:underline">Pacientes</Link>}
          {ehAdmin && <Link href="/usuarios" className="text-sm text-slate-600 hover:underline">Usuários</Link>}
          {ehAdmin && <Link href="/auditoria" className="text-sm text-slate-600 hover:underline">Auditoria</Link>}
        </nav>
```

E, logo após a linha `const ehAdmin = usuario.perfil === "ADMINISTRADOR";`, acrescente:

```tsx
  const podeVerPacientes = perfilPermitido(usuario.perfil, PERFIS_LEITURA_PACIENTE);
```

E acrescente aos imports do arquivo:

```tsx
import { perfilPermitido } from "@/lib/perfis";
import { PERFIS_LEITURA_PACIENTE } from "@/lib/pacientes/permissoes";
```

Também acrescente o link "Minha conta" ao lado do nome do usuário — o bloco à direita do header:

```tsx
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <Link href="/conta" className="hover:underline">{usuario.nome} — {rotuloPerfil[usuario.perfil]}</Link>
          <form action={sair}>
            <button className="text-red-600 hover:underline">Sair</button>
          </form>
        </div>
```

- [ ] **Step 3: Verificação**

Run: `npm test` e `npm run build`
Esperado: testes passando; build compila e mostra a rota `ƒ /pacientes`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: lista de pacientes com busca e filtros"
```

---

### Task 8: Cadastro de novo paciente

**Files:**
- Create: `src/app/(app)/pacientes/acoes.ts`, `src/app/(app)/pacientes/novo/page.tsx`, `src/app/(app)/pacientes/novo/formulario.tsx`

- [ ] **Step 1: Server actions**

```ts
// src/app/(app)/pacientes/acoes.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_CADASTRO_PACIENTE, PERFIS_CLINICO_PACIENTE } from "@/lib/pacientes/permissoes";
import {
  criarPaciente, atualizarIdentificacao, atualizarNefrologicos, mudarSituacao,
  type DadosIdentificacao,
} from "@/lib/pacientes/servico";
import type { Modalidade, Sexo, SituacaoPaciente, TipoVinculo } from "@prisma/client";

export type EstadoPaciente = { erro: string } | undefined;

function texto(formData: FormData, campo: string): string | undefined {
  const valor = String(formData.get(campo) ?? "").trim();
  return valor || undefined;
}

function data(formData: FormData, campo: string): Date | undefined {
  const valor = texto(formData, campo);
  return valor ? new Date(valor) : undefined;
}

function lerIdentificacao(formData: FormData): DadosIdentificacao | { erro: string } {
  const dataNascimento = data(formData, "dataNascimento");
  if (!dataNascimento) return { erro: "Informe a data de nascimento." };
  const sexo = String(formData.get("sexo") ?? "");
  if (!["FEMININO", "MASCULINO", "OUTRO"].includes(sexo)) return { erro: "Informe o sexo." };
  const tipoVinculo = String(formData.get("tipoVinculo") ?? "");
  if (!["SUS", "CONVENIO"].includes(tipoVinculo)) return { erro: "Informe o vínculo." };

  return {
    nome: String(formData.get("nome") ?? ""),
    cpf: String(formData.get("cpf") ?? ""),
    cns: texto(formData, "cns"),
    dataNascimento,
    sexo: sexo as Sexo,
    telefone: texto(formData, "telefone"),
    emailContato: texto(formData, "emailContato"),
    logradouro: texto(formData, "logradouro"),
    numero: texto(formData, "numero"),
    complemento: texto(formData, "complemento"),
    bairro: texto(formData, "bairro"),
    cidade: texto(formData, "cidade"),
    uf: texto(formData, "uf"),
    cep: texto(formData, "cep"),
    contatoEmergenciaNome: texto(formData, "contatoEmergenciaNome"),
    contatoEmergenciaTelefone: texto(formData, "contatoEmergenciaTelefone"),
    tipoVinculo: tipoVinculo as TipoVinculo,
    convenioNome: texto(formData, "convenioNome"),
    convenioMatricula: texto(formData, "convenioMatricula"),
    convenioValidade: data(formData, "convenioValidade"),
  };
}

export async function acaoCriarPaciente(_anterior: EstadoPaciente, formData: FormData): Promise<EstadoPaciente> {
  const autor = await exigirPerfil(...PERFIS_CADASTRO_PACIENTE);
  const lido = lerIdentificacao(formData);
  if ("erro" in lido) return { erro: lido.erro };

  const resultado = await criarPaciente(lido, autor.id);
  if (!resultado.ok) return { erro: resultado.erro };
  revalidatePath("/pacientes");
  redirect(`/pacientes/${resultado.id}`);
}

export async function acaoAtualizarIdentificacao(
  _anterior: EstadoPaciente,
  formData: FormData,
): Promise<EstadoPaciente> {
  const autor = await exigirPerfil(...PERFIS_CADASTRO_PACIENTE);
  const id = String(formData.get("id") ?? "");
  const lido = lerIdentificacao(formData);
  if ("erro" in lido) return { erro: lido.erro };

  const resultado = await atualizarIdentificacao(id, lido, autor.id);
  if (!resultado.ok) return { erro: resultado.erro };
  revalidatePath(`/pacientes/${id}`);
  return undefined;
}

export async function acaoAtualizarNefrologicos(
  _anterior: EstadoPaciente,
  formData: FormData,
): Promise<EstadoPaciente> {
  const autor = await exigirPerfil(...PERFIS_CLINICO_PACIENTE);
  const id = String(formData.get("id") ?? "");
  const modalidade = String(formData.get("modalidade") ?? "");

  const resultado = await atualizarNefrologicos(
    id,
    {
      cidDoencaBase: texto(formData, "cidDoencaBase"),
      dataInicioDialise: data(formData, "dataInicioDialise"),
      modalidade: (modalidade || undefined) as Modalidade | undefined,
    },
    autor.id,
  );
  if (!resultado.ok) return { erro: resultado.erro };
  revalidatePath(`/pacientes/${id}`);
  return undefined;
}

export async function acaoMudarSituacao(_anterior: EstadoPaciente, formData: FormData): Promise<EstadoPaciente> {
  const autor = await exigirPerfil(...PERFIS_CLINICO_PACIENTE);
  const id = String(formData.get("id") ?? "");
  const para = String(formData.get("situacao") ?? "");
  if (!["ATIVO", "TRANSPLANTADO", "OBITO", "TRANSFERIDO", "EM_TRANSITO"].includes(para))
    return { erro: "Situação inválida." };

  const resultado = await mudarSituacao(id, para as SituacaoPaciente, texto(formData, "motivo"), autor.id);
  if (!resultado.ok) return { erro: resultado.erro };
  revalidatePath(`/pacientes/${id}`);
  return undefined;
}
```

- [ ] **Step 2: Página de novo paciente**

```tsx
// src/app/(app)/pacientes/novo/page.tsx
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_CADASTRO_PACIENTE } from "@/lib/pacientes/permissoes";
import { FormularioNovoPaciente } from "./formulario";

export default async function PaginaNovoPaciente() {
  await exigirPerfil(...PERFIS_CADASTRO_PACIENTE);
  return (
    <div className="max-w-3xl">
      <h1 className="mb-4 text-xl font-semibold text-slate-800">Novo paciente</h1>
      <p className="mb-4 text-sm text-slate-500">
        Os dados nefrológicos (doença de base, início da diálise, modalidade) são preenchidos pela
        equipe clínica na ficha do paciente, depois do cadastro.
      </p>
      <FormularioNovoPaciente />
    </div>
  );
}
```

- [ ] **Step 3: Formulário**

```tsx
// src/app/(app)/pacientes/novo/formulario.tsx
"use client";

import { useActionState, useState } from "react";
import { acaoCriarPaciente } from "../acoes";

const CAMPO = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm";
const ROTULO = "block text-sm font-medium text-slate-700";

export function FormularioNovoPaciente() {
  const [estado, acao, pendente] = useActionState(acaoCriarPaciente, undefined);
  const [vinculo, setVinculo] = useState("SUS");

  return (
    <form action={acao} className="space-y-6">
      <fieldset className="rounded bg-white p-6 shadow-sm">
        <legend className="px-2 text-sm font-semibold text-slate-700">Identificação</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="nome" className={ROTULO}>Nome completo</label>
            <input id="nome" name="nome" required className={CAMPO} />
          </div>
          <div>
            <label htmlFor="cpf" className={ROTULO}>CPF</label>
            <input id="cpf" name="cpf" required placeholder="000.000.000-00" className={CAMPO} />
          </div>
          <div>
            <label htmlFor="cns" className={ROTULO}>CNS (Cartão SUS)</label>
            <input id="cns" name="cns" placeholder="15 dígitos" className={CAMPO} />
          </div>
          <div>
            <label htmlFor="dataNascimento" className={ROTULO}>Data de nascimento</label>
            <input id="dataNascimento" name="dataNascimento" type="date" required className={CAMPO} />
          </div>
          <div>
            <label htmlFor="sexo" className={ROTULO}>Sexo</label>
            <select id="sexo" name="sexo" required className={CAMPO}>
              <option value="FEMININO">Feminino</option>
              <option value="MASCULINO">Masculino</option>
              <option value="OUTRO">Outro</option>
            </select>
          </div>
          <div>
            <label htmlFor="telefone" className={ROTULO}>Telefone</label>
            <input id="telefone" name="telefone" className={CAMPO} />
          </div>
          <div>
            <label htmlFor="emailContato" className={ROTULO}>E-mail</label>
            <input id="emailContato" name="emailContato" type="email" className={CAMPO} />
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded bg-white p-6 shadow-sm">
        <legend className="px-2 text-sm font-semibold text-slate-700">Endereço</legend>
        <div className="grid gap-4 sm:grid-cols-6">
          <div className="sm:col-span-4">
            <label htmlFor="logradouro" className={ROTULO}>Logradouro</label>
            <input id="logradouro" name="logradouro" className={CAMPO} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="numero" className={ROTULO}>Número</label>
            <input id="numero" name="numero" className={CAMPO} />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="complemento" className={ROTULO}>Complemento</label>
            <input id="complemento" name="complemento" className={CAMPO} />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="bairro" className={ROTULO}>Bairro</label>
            <input id="bairro" name="bairro" className={CAMPO} />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="cidade" className={ROTULO}>Cidade</label>
            <input id="cidade" name="cidade" className={CAMPO} />
          </div>
          <div className="sm:col-span-1">
            <label htmlFor="uf" className={ROTULO}>UF</label>
            <input id="uf" name="uf" maxLength={2} className={CAMPO} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cep" className={ROTULO}>CEP</label>
            <input id="cep" name="cep" className={CAMPO} />
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded bg-white p-6 shadow-sm">
        <legend className="px-2 text-sm font-semibold text-slate-700">Contato de emergência</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="contatoEmergenciaNome" className={ROTULO}>Nome</label>
            <input id="contatoEmergenciaNome" name="contatoEmergenciaNome" className={CAMPO} />
          </div>
          <div>
            <label htmlFor="contatoEmergenciaTelefone" className={ROTULO}>Telefone</label>
            <input id="contatoEmergenciaTelefone" name="contatoEmergenciaTelefone" className={CAMPO} />
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded bg-white p-6 shadow-sm">
        <legend className="px-2 text-sm font-semibold text-slate-700">Vínculo assistencial</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tipoVinculo" className={ROTULO}>Tipo</label>
            <select
              id="tipoVinculo" name="tipoVinculo" required className={CAMPO}
              value={vinculo} onChange={(e) => setVinculo(e.target.value)}
            >
              <option value="SUS">SUS</option>
              <option value="CONVENIO">Convênio</option>
            </select>
          </div>
          {vinculo === "CONVENIO" && (
            <>
              <div>
                <label htmlFor="convenioNome" className={ROTULO}>Convênio</label>
                <input id="convenioNome" name="convenioNome" className={CAMPO} />
              </div>
              <div>
                <label htmlFor="convenioMatricula" className={ROTULO}>Matrícula</label>
                <input id="convenioMatricula" name="convenioMatricula" className={CAMPO} />
              </div>
              <div>
                <label htmlFor="convenioValidade" className={ROTULO}>Validade</label>
                <input id="convenioValidade" name="convenioValidade" type="date" className={CAMPO} />
              </div>
            </>
          )}
        </div>
      </fieldset>

      {estado?.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <button
        type="submit" disabled={pendente}
        className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
      >
        {pendente ? "Salvando..." : "Cadastrar paciente"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Verificação**

Run: `npm test` e `npm run build`
Esperado: testes passando; build compila com `ƒ /pacientes/novo`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: cadastro de novo paciente"
```

---

### Task 9: Ficha do paciente

**Files:**
- Create: `src/app/(app)/pacientes/[id]/page.tsx`, `src/app/(app)/pacientes/[id]/formulario-nefrologicos.tsx`, `src/app/(app)/pacientes/[id]/formulario-situacao.tsx`

- [ ] **Step 1: Página da ficha**

```tsx
// src/app/(app)/pacientes/[id]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_LEITURA_PACIENTE, PERFIS_CLINICO_PACIENTE } from "@/lib/pacientes/permissoes";
import { perfilPermitido } from "@/lib/perfis";
import { db } from "@/lib/db";
import { formatarCpf } from "@/lib/pacientes/documentos";
import { registrarEvento } from "@/lib/auditoria";
import { FormularioNefrologicos } from "./formulario-nefrologicos";
import { FormularioSituacao } from "./formulario-situacao";
import type { Modalidade, SituacaoPaciente } from "@prisma/client";

const ROTULO_SITUACAO: Record<SituacaoPaciente, string> = {
  ATIVO: "Ativo",
  TRANSPLANTADO: "Transplantado",
  OBITO: "Óbito",
  TRANSFERIDO: "Transferido",
  EM_TRANSITO: "Em trânsito",
};

const ROTULO_MODALIDADE: Record<Modalidade, string> = {
  HEMODIALISE: "Hemodiálise",
  DIALISE_PERITONEAL: "Diálise peritoneal",
};

function formatarData(data: Date | null): string {
  if (!data) return "—";
  return data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export default async function PaginaPaciente({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirPerfil(...PERFIS_LEITURA_PACIENTE);
  const { id } = await params;

  const paciente = await db.paciente.findUnique({
    where: { id },
    include: {
      mudancasSituacao: { orderBy: { registradoEm: "desc" } },
    },
  });
  if (!paciente) notFound();

  // LGPD/CFM: toda visualização de dado de paciente é registrada
  await registrarEvento({
    usuarioId: usuario.id,
    acao: "paciente.visualizar",
    entidade: "Paciente",
    entidadeId: paciente.id,
  });

  const podeEditarClinico = perfilPermitido(usuario.perfil, PERFIS_CLINICO_PACIENTE);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/pacientes" className="text-sm text-blue-700 hover:underline">← Pacientes</Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-800">{paciente.nome}</h1>
        <p className="text-sm text-slate-500">
          {formatarCpf(paciente.cpf)} · {formatarData(paciente.dataNascimento)} ·{" "}
          <span className="font-medium">{ROTULO_SITUACAO[paciente.situacao]}</span>
        </p>
      </div>

      <section className="rounded bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Identificação e vínculo</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">CNS</dt><dd>{paciente.cns ?? "—"}</dd></div>
          <div><dt className="text-slate-500">Telefone</dt><dd>{paciente.telefone ?? "—"}</dd></div>
          <div><dt className="text-slate-500">E-mail</dt><dd>{paciente.emailContato ?? "—"}</dd></div>
          <div>
            <dt className="text-slate-500">Endereço</dt>
            <dd>
              {[paciente.logradouro, paciente.numero, paciente.bairro, paciente.cidade, paciente.uf]
                .filter(Boolean)
                .join(", ") || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Contato de emergência</dt>
            <dd>
              {paciente.contatoEmergenciaNome
                ? `${paciente.contatoEmergenciaNome} — ${paciente.contatoEmergenciaTelefone ?? "sem telefone"}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Vínculo</dt>
            <dd>
              {paciente.tipoVinculo === "SUS"
                ? "SUS"
                : `${paciente.convenioNome ?? "Convênio"} — matrícula ${paciente.convenioMatricula ?? "—"}`}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Dados nefrológicos</h2>
        {podeEditarClinico ? (
          <FormularioNefrologicos
            id={paciente.id}
            cidDoencaBase={paciente.cidDoencaBase ?? ""}
            dataInicioDialise={paciente.dataInicioDialise?.toISOString().slice(0, 10) ?? ""}
            modalidade={paciente.modalidade ?? ""}
          />
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-slate-500">Doença de base (CID)</dt><dd>{paciente.cidDoencaBase ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Início da diálise</dt><dd>{formatarData(paciente.dataInicioDialise)}</dd></div>
            <div>
              <dt className="text-slate-500">Modalidade</dt>
              <dd>{paciente.modalidade ? ROTULO_MODALIDADE[paciente.modalidade] : "—"}</dd>
            </div>
          </dl>
        )}
      </section>

      <section className="rounded bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Situação</h2>
        {podeEditarClinico && <FormularioSituacao id={paciente.id} situacaoAtual={paciente.situacao} />}
        {paciente.mudancasSituacao.length > 0 ? (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-2">Data</th>
                <th className="py-2">De</th>
                <th className="py-2">Para</th>
                <th className="py-2">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {paciente.mudancasSituacao.map((mudanca) => (
                <tr key={mudanca.id} className="border-b">
                  <td className="py-2">{formatarData(mudanca.registradoEm)}</td>
                  <td className="py-2">{mudanca.de ? ROTULO_SITUACAO[mudanca.de] : "—"}</td>
                  <td className="py-2">{ROTULO_SITUACAO[mudanca.para]}</td>
                  <td className="py-2">{mudanca.motivo ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Nenhuma mudança de situação registrada.</p>
        )}
      </section>

      <p className="text-xs text-slate-400">
        Acessos e sorologias, medicações, alergias e evoluções chegam nas próximas entregas.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Formulário de dados nefrológicos**

```tsx
// src/app/(app)/pacientes/[id]/formulario-nefrologicos.tsx
"use client";

import { useActionState } from "react";
import { acaoAtualizarNefrologicos } from "../acoes";

const CAMPO = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm";
const ROTULO = "block text-sm font-medium text-slate-700";

export function FormularioNefrologicos({
  id,
  cidDoencaBase,
  dataInicioDialise,
  modalidade,
}: {
  id: string;
  cidDoencaBase: string;
  dataInicioDialise: string;
  modalidade: string;
}) {
  const [estado, acao, pendente] = useActionState(acaoAtualizarNefrologicos, undefined);
  return (
    <form action={acao} className="grid gap-4 sm:grid-cols-3">
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor="cidDoencaBase" className={ROTULO}>Doença de base (CID)</label>
        <input id="cidDoencaBase" name="cidDoencaBase" defaultValue={cidDoencaBase} placeholder="N18.5" className={CAMPO} />
      </div>
      <div>
        <label htmlFor="dataInicioDialise" className={ROTULO}>Início da diálise</label>
        <input id="dataInicioDialise" name="dataInicioDialise" type="date" defaultValue={dataInicioDialise} className={CAMPO} />
      </div>
      <div>
        <label htmlFor="modalidade" className={ROTULO}>Modalidade</label>
        <select id="modalidade" name="modalidade" defaultValue={modalidade} className={CAMPO}>
          <option value="">Não informada</option>
          <option value="HEMODIALISE">Hemodiálise</option>
          <option value="DIALISE_PERITONEAL">Diálise peritoneal</option>
        </select>
      </div>
      {estado?.erro && <p className="text-sm text-red-600 sm:col-span-3">{estado.erro}</p>}
      <div className="sm:col-span-3">
        <button
          type="submit" disabled={pendente}
          className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {pendente ? "Salvando..." : "Salvar dados nefrológicos"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Formulário de mudança de situação**

```tsx
// src/app/(app)/pacientes/[id]/formulario-situacao.tsx
"use client";

import { useActionState } from "react";
import { acaoMudarSituacao } from "../acoes";

const CAMPO = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm";
const ROTULO = "block text-sm font-medium text-slate-700";

export function FormularioSituacao({ id, situacaoAtual }: { id: string; situacaoAtual: string }) {
  const [estado, acao, pendente] = useActionState(acaoMudarSituacao, undefined);
  return (
    <form action={acao} className="grid gap-4 sm:grid-cols-3">
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor="situacao" className={ROTULO}>Nova situação</label>
        <select id="situacao" name="situacao" defaultValue={situacaoAtual} className={CAMPO}>
          <option value="ATIVO">Ativo</option>
          <option value="TRANSPLANTADO">Transplantado</option>
          <option value="OBITO">Óbito</option>
          <option value="TRANSFERIDO">Transferido</option>
          <option value="EM_TRANSITO">Em trânsito</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="motivo" className={ROTULO}>Motivo</label>
        <input id="motivo" name="motivo" placeholder="Ex.: transplante realizado no HC" className={CAMPO} />
      </div>
      {estado?.erro && <p className="text-sm text-red-600 sm:col-span-3">{estado.erro}</p>}
      <div className="sm:col-span-3">
        <button
          type="submit" disabled={pendente}
          className="rounded bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pendente ? "Registrando..." : "Registrar mudança"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Verificação**

Run: `npm test` e `npm run build`
Esperado: testes passando; build compila com `ƒ /pacientes/[id]`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: ficha do paciente com dados nefrologicos e situacao"
```

---

### Task 10: Troca de senha pelo próprio usuário (TDD)

**Files:**
- Modify: `src/lib/usuarios/servico.ts`
- Create: `src/app/(app)/conta/page.tsx`, `src/app/(app)/conta/formulario.tsx`, `src/app/(app)/conta/acoes.ts`
- Test: `tests/conta-senha.test.ts`

- [ ] **Step 1: Escrever os testes (devem falhar)**

```ts
// tests/conta-senha.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { alterarPropriaSenha } from "@/lib/usuarios/servico";
import { criarUsuarioTeste, limparBanco } from "./ajuda";
import { criarSessao, validarSessao } from "@/lib/auth/sessao";
import { verificarSenha } from "@/lib/auth/senha";
import { db } from "@/lib/db";

describe("alterar a propria senha", () => {
  beforeEach(limparBanco);

  it("troca a senha quando a atual confere e audita", async () => {
    const usuario = await criarUsuarioTeste({ senha: "SenhaAntiga1", email: "u@clinica.local" });
    const resultado = await alterarPropriaSenha(usuario.id, "SenhaAntiga1", "SenhaNovaForte1");
    expect(resultado.ok).toBe(true);
    const atualizado = await db.usuario.findUnique({ where: { id: usuario.id } });
    expect(await verificarSenha("SenhaNovaForte1", atualizado!.senhaHash)).toBe(true);
    const eventos = await db.eventoAuditoria.findMany({ where: { acao: "usuario.alterar_propria_senha" } });
    expect(eventos).toHaveLength(1);
  });

  it("rejeita quando a senha atual está errada", async () => {
    const usuario = await criarUsuarioTeste({ senha: "SenhaAntiga1", email: "u@clinica.local" });
    const resultado = await alterarPropriaSenha(usuario.id, "SenhaErrada9", "SenhaNovaForte1");
    expect(resultado).toEqual({ ok: false, erro: "Senha atual incorreta." });
    const atualizado = await db.usuario.findUnique({ where: { id: usuario.id } });
    expect(await verificarSenha("SenhaAntiga1", atualizado!.senhaHash)).toBe(true);
  });

  it("rejeita senha nova curta", async () => {
    const usuario = await criarUsuarioTeste({ senha: "SenhaAntiga1", email: "u@clinica.local" });
    const resultado = await alterarPropriaSenha(usuario.id, "SenhaAntiga1", "curta");
    expect(resultado).toEqual({ ok: false, erro: "A senha deve ter ao menos 10 caracteres." });
  });

  it("rejeita quando a nova senha é igual à atual", async () => {
    const usuario = await criarUsuarioTeste({ senha: "SenhaAntiga1", email: "u@clinica.local" });
    const resultado = await alterarPropriaSenha(usuario.id, "SenhaAntiga1", "SenhaAntiga1");
    expect(resultado).toEqual({ ok: false, erro: "A nova senha deve ser diferente da atual." });
  });

  it("derruba as outras sessões do usuário ao trocar a senha", async () => {
    const usuario = await criarUsuarioTeste({ senha: "SenhaAntiga1", email: "u@clinica.local" });
    const token = await criarSessao(usuario.id);
    const resultado = await alterarPropriaSenha(usuario.id, "SenhaAntiga1", "SenhaNovaForte1");
    expect(resultado.ok).toBe(true);
    expect(await validarSessao(token)).toBeNull();
  });
});
```

- [ ] **Step 2: Verificar que falham**

Run: `npm test -- conta-senha`
Esperado: FAIL — `alterarPropriaSenha` não existe.

- [ ] **Step 3: Implementar no serviço**

Em `src/lib/usuarios/servico.ts`, acrescente o import de `verificarSenha` na linha 2 (que hoje é
`import { gerarHashSenha } from "@/lib/auth/senha";`), deixando-a assim:

```ts
import { gerarHashSenha, verificarSenha } from "@/lib/auth/senha";
```

E acrescente ao FINAL do arquivo:

```ts
export async function alterarPropriaSenha(
  usuarioId: string,
  senhaAtual: string,
  novaSenha: string,
): Promise<ResultadoUsuario> {
  if (novaSenha.length < TAMANHO_MINIMO_SENHA)
    return { ok: false, erro: `A senha deve ter ao menos ${TAMANHO_MINIMO_SENHA} caracteres.` };

  const usuario = await db.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) return { ok: false, erro: "Usuário não encontrado." };
  if (!(await verificarSenha(senhaAtual, usuario.senhaHash)))
    return { ok: false, erro: "Senha atual incorreta." };
  if (await verificarSenha(novaSenha, usuario.senhaHash))
    return { ok: false, erro: "A nova senha deve ser diferente da atual." };

  await db.usuario.update({ where: { id: usuarioId }, data: { senhaHash: await gerarHashSenha(novaSenha) } });
  await db.sessao.deleteMany({ where: { usuarioId } }); // força novo login em todos os dispositivos
  await registrarEvento({
    usuarioId,
    acao: "usuario.alterar_propria_senha",
    entidade: "Usuario",
    entidadeId: usuarioId,
  });
  return { ok: true, id: usuarioId };
}
```

- [ ] **Step 4: Verificar que passam**

Run: `npm test -- conta-senha`
Esperado: 5 testes passando.

- [ ] **Step 5: Tela da conta**

```ts
// src/app/(app)/conta/acoes.ts
"use server";

import { exigirUsuario } from "@/lib/auth/contexto";
import { alterarPropriaSenha } from "@/lib/usuarios/servico";

export type EstadoConta = { erro: string } | { sucesso: string } | undefined;

export async function acaoAlterarSenha(_anterior: EstadoConta, formData: FormData): Promise<EstadoConta> {
  const usuario = await exigirUsuario();
  const resultado = await alterarPropriaSenha(
    usuario.id,
    String(formData.get("senhaAtual") ?? ""),
    String(formData.get("novaSenha") ?? ""),
  );
  if (!resultado.ok) return { erro: resultado.erro };
  return { sucesso: "Senha alterada. Entre novamente com a nova senha." };
}
```

```tsx
// src/app/(app)/conta/page.tsx
import { exigirUsuario } from "@/lib/auth/contexto";
import { rotuloPerfil } from "@/lib/perfis";
import { FormularioSenha } from "./formulario";

export default async function PaginaConta() {
  const usuario = await exigirUsuario();
  return (
    <div className="max-w-md">
      <h1 className="mb-1 text-xl font-semibold text-slate-800">Minha conta</h1>
      <p className="mb-4 text-sm text-slate-500">
        {usuario.nome} — {usuario.email} — {rotuloPerfil[usuario.perfil]}
      </p>
      <FormularioSenha />
    </div>
  );
}
```

```tsx
// src/app/(app)/conta/formulario.tsx
"use client";

import { useActionState } from "react";
import { acaoAlterarSenha } from "./acoes";

const CAMPO = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm";
const ROTULO = "block text-sm font-medium text-slate-700";

export function FormularioSenha() {
  const [estado, acao, pendente] = useActionState(acaoAlterarSenha, undefined);
  return (
    <form action={acao} className="space-y-4 rounded bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-700">Trocar senha</h2>
      <div>
        <label htmlFor="senhaAtual" className={ROTULO}>Senha atual</label>
        <input id="senhaAtual" name="senhaAtual" type="password" autoComplete="current-password" required className={CAMPO} />
      </div>
      <div>
        <label htmlFor="novaSenha" className={ROTULO}>Nova senha (mín. 10 caracteres)</label>
        <input id="novaSenha" name="novaSenha" type="password" autoComplete="new-password" minLength={10} required className={CAMPO} />
      </div>
      {estado && "erro" in estado && <p className="text-sm text-red-600">{estado.erro}</p>}
      {estado && "sucesso" in estado && <p className="text-sm text-green-700">{estado.sucesso}</p>}
      <button
        type="submit" disabled={pendente}
        className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
      >
        {pendente ? "Salvando..." : "Trocar senha"}
      </button>
    </form>
  );
}
```

- [ ] **Step 6: Verificação e commit**

Run: `npm test` e `npm run build`
Esperado: testes passando; build compila com `ƒ /conta`.

```bash
git add -A
git commit -m "feat: troca de senha pelo proprio usuario"
```

---

### Task 11: Verificação final da entrega

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Documentar o seed demo no README**

Na seção "Primeira execução" do `README.md`, logo após a linha do `npx prisma db seed`, acrescente:

```markdown
npm run seed:demo             # (opcional) carrega 10 pacientes FICTÍCIOS para testar
```

E na seção "Banco de dados", ao final, acrescente:

```markdown
O comando `npm run seed:demo` cria pacientes fictícios (CPF/CNS gerados por algoritmo, sem
correspondência com pessoas reais). Nunca rode contra um banco com dados reais.
```

- [ ] **Step 2: Verificação completa**

Run: `npm run lint && npm test && npm run build`
Esperado: lint limpo, todos os testes passando, build ok.

Rotas esperadas no build: `/`, `/conta`, `/pacientes`, `/pacientes/novo`, `/pacientes/[id]`,
`/usuarios`, `/usuarios/novo`, `/auditoria`, `/login`, `/sem-permissao`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: README com seed demo de pacientes"
```

---

## Checklist manual (feito pelo controlador, não pelo subagente)

1. Como admin: menu Pacientes **não** aparece; acessar `/pacientes` direto → `/sem-permissao`.
2. Como recepção: lista mostra os 10 pacientes demo; busca por nome, CPF com pontuação e CNS funciona; filtros de situação/modalidade/vínculo funcionam.
3. Como recepção: ficha do paciente mostra dados nefrológicos **somente leitura** (sem formulário).
4. Como médico: ficha permite editar dados nefrológicos e registrar mudança de situação com motivo; o histórico aparece na tabela.
5. Mudar para a mesma situação → erro "O paciente já está nesta situação."
6. Cadastrar paciente com CPF inválido → erro claro; com CPF duplicado → erro claro.
7. Auditoria (como admin): eventos `paciente.listar`, `paciente.visualizar`, `paciente.criar`, `paciente.mudar_situacao` aparecem.
8. Trocar a própria senha em `/conta` e confirmar que o login antigo não funciona mais.

## Fora do escopo (entregas seguintes)

- **Entrega 3:** acessos vasculares, sorologias, medicações, alergias e tela de resumo do paciente.
- **Entrega 4:** evoluções com templates, assinatura e adendos.
- **Entrega 5:** foto do paciente, documentos anexados, PDF do prontuário, exportação de listas para Excel.
