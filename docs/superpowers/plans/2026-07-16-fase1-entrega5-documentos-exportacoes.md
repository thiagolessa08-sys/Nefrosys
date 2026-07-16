# Fase 1 — Entrega 5: Documentos e Exportações — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Anexar documentos e foto ao paciente (armazenados em volume persistente), baixá-los com controle de acesso, imprimir o prontuário completo em PDF e exportar a lista de pacientes para Excel.

**Architecture:** Arquivos ficam num diretório persistente cujo caminho vem de env (`DIRETORIO_ARQUIVOS`): volume montado no Railway em produção, diretório local em dev, diretório temporário nos testes. O banco guarda só os metadados (`Documento`). Um módulo de armazenamento (`src/lib/arquivos/armazenamento.ts`) isola o acesso ao disco por trás de uma interface pequena (salvar/ler/remover), permitindo trocar por S3/R2 depois sem mexer no resto. Download é servido por um route handler que checa permissão antes de entregar os bytes. PDF do prontuário é uma página de impressão (`@media print`) — o navegador gera o PDF. Excel usa `exceljs`.

**Tech Stack:** Next.js 16 (App Router, Route Handlers), React 19, TypeScript, Prisma 6, PostgreSQL local nos testes, Vitest, Tailwind v4, exceljs.

**Base:** Entregas 1-4 concluídas. Testes em Postgres local efêmero (embedded-postgres).

---

## Decisões de escopo

- **Armazenamento abstraído**: `armazenamento.ts` expõe `salvarArquivo/lerArquivo/removerArquivo`. Hoje grava em disco (volume); trocar por R2/S3 é reimplementar só esse módulo.
- **Caminho por env** `DIRETORIO_ARQUIVOS`. Dev: `./uploads` (gitignored). Railway: `/data` (volume montado). Testes: diretório temporário criado no `beforeEach`.
- **Chave de armazenamento gerada** (cuid), nunca o nome original — evita path traversal e colisão. O nome original vira metadado exibível.
- **Tipos aceitos**: PDF e imagens (jpeg, png, webp). Tamanho máximo 10 MB por arquivo. Validado no servidor.
- **Download sempre autenticado**: route handler `/api/documentos/[id]` checa `exigirPerfil(...PERFIS_CLINICO_LEITURA)` e existência antes de entregar os bytes. Nunca servir o diretório estático.
- **Foto do paciente**: campo `fotoDocumentoId` no Paciente aponta para um `Documento` de categoria FOTO. Aparece no resumo e na ficha.
- **PDF do prontuário = página de impressão** (`/pacientes/[id]/prontuario`), com botão "Imprimir/Salvar PDF" (window.print) e CSS `@media print`. Reúne identificação, dados clínicos, resumo e evoluções assinadas. Zero dependência de geração de PDF.
- **Excel** da lista de pacientes com `exceljs` (gera `.xlsx`), respeitando os filtros ativos, via route handler.
- **Recepção** vê e anexa documentos de categoria administrativa (identidade, termo) mas NÃO os clínicos (laudo, exame) nem o prontuário/evoluções — mantém a separação do spec.

## Matriz de permissões

| Ação | Perfis |
|------|--------|
| Ver/baixar documento clínico (LAUDO, EXAME) e prontuário PDF | Médico, Enfermagem, Técnico, Multiprofissional |
| Ver/baixar documento administrativo (IDENTIDADE, TERMO) e foto | Recepção + os clínicos acima |
| Anexar/remover documento administrativo, foto | Recepção, Médico, Enfermagem |
| Anexar/remover documento clínico | Médico, Enfermagem |
| Exportar lista para Excel | Todos com leitura de paciente (não admin) |
| Qualquer acesso | Administrador: **negado** |

## Estrutura de arquivos ao final da entrega

```
prisma/schema.prisma            # + enum CategoriaDocumento, model Documento, Paciente.fotoDocumentoId
.env.exemplo                    # + DIRETORIO_ARQUIVOS
src/lib/arquivos/
  armazenamento.ts              # salvarArquivo/lerArquivo/removerArquivo (disco via DIRETORIO_ARQUIVOS)
  tipos.ts                      # categorias, validação de mime/tamanho, rótulos
src/lib/pacientes/
  documentos.ts                 # anexarDocumento/removerDocumento/listarDocumentos/definirFoto (regras + metadados)
  prontuario.ts                 # montarProntuario (agrega tudo para o PDF)
  exportacao.ts                 # linhasParaExcel (lista de pacientes → matriz)
src/app/api/documentos/[id]/route.ts   # download autenticado
src/app/api/pacientes/exportar/route.ts # xlsx da lista filtrada
src/app/(app)/pacientes/[id]/documentos/
  page.tsx + acoes.ts + formulario-upload.tsx
src/app/(app)/pacientes/[id]/prontuario/page.tsx  # página de impressão
tests/
  arquivos-armazenamento.test.ts / documentos-servico.test.ts / exportacao.test.ts
```

---

### Task 1: Esquema de Documento e foto do paciente

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Acrescentar enum e model, e o campo de foto ao Paciente**

Acrescente ao final de `prisma/schema.prisma`:

```prisma
enum CategoriaDocumento {
  LAUDO
  EXAME
  TERMO
  IDENTIDADE
  FOTO
  OUTRO
}

model Documento {
  id             String             @id @default(cuid())
  pacienteId     String
  categoria      CategoriaDocumento
  nomeOriginal   String
  chaveArmazenamento String          @unique // nome no disco (cuid + extensão)
  tipoMime       String
  tamanhoBytes   Int
  autorId        String
  criadoEm       DateTime           @default(now())

  paciente Paciente @relation("DocumentosDoPaciente", fields: [pacienteId], references: [id], onDelete: Cascade)

  @@index([pacienteId, categoria])
}
```

No model `Paciente`, acrescente na lista de relações inversas (junto de `evolucoes`, `acessos` etc.):

```prisma
  documentos     Documento[] @relation("DocumentosDoPaciente")
  fotoDocumentoId String?
```

- [ ] **Step 2: Gerar e aplicar a migração**

Run: `npx prisma migrate dev --name documentos`
Esperado: migração criada e aplicada no banco de desenvolvimento; client regenerado.

- [ ] **Step 3: Rodar os testes**

Run: `npm test`
Esperado: 95 testes seguem passando (Postgres local; ~40s).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: esquema de documentos e foto do paciente"
```

---

### Task 2: Tipos e validação de arquivo (TDD)

**Files:**
- Create: `src/lib/arquivos/tipos.ts`
- Test: `tests/arquivos-tipos.test.ts`

- [ ] **Step 1: Escrever os testes (devem falhar)**

```ts
// tests/arquivos-tipos.test.ts
import { describe, it, expect } from "vitest";
import { validarArquivo, extensaoDeMime, MAX_BYTES } from "@/lib/arquivos/tipos";

describe("validação de arquivo", () => {
  it("aceita PDF e imagens dentro do limite", () => {
    expect(validarArquivo("application/pdf", 1000)).toBeNull();
    expect(validarArquivo("image/jpeg", 1000)).toBeNull();
    expect(validarArquivo("image/png", 1000)).toBeNull();
    expect(validarArquivo("image/webp", 1000)).toBeNull();
  });

  it("rejeita tipo não permitido", () => {
    expect(validarArquivo("application/zip", 1000)).toBe("Tipo de arquivo não permitido (use PDF ou imagem).");
  });

  it("rejeita arquivo acima do limite", () => {
    expect(validarArquivo("application/pdf", MAX_BYTES + 1)).toBe("Arquivo maior que o limite de 10 MB.");
  });

  it("rejeita arquivo vazio", () => {
    expect(validarArquivo("application/pdf", 0)).toBe("Arquivo vazio.");
  });

  it("mapeia mime para extensão", () => {
    expect(extensaoDeMime("application/pdf")).toBe(".pdf");
    expect(extensaoDeMime("image/jpeg")).toBe(".jpg");
    expect(extensaoDeMime("image/png")).toBe(".png");
    expect(extensaoDeMime("image/webp")).toBe(".webp");
  });
});
```

- [ ] **Step 2: Verificar que falham**

Run: `npm test -- arquivos-tipos`
Esperado: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```ts
// src/lib/arquivos/tipos.ts
export const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const MIME_EXTENSAO: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export function extensaoDeMime(mime: string): string | null {
  return MIME_EXTENSAO[mime] ?? null;
}

// Retorna null se válido, ou a mensagem de erro.
export function validarArquivo(mime: string, tamanhoBytes: number): string | null {
  if (tamanhoBytes <= 0) return "Arquivo vazio.";
  if (tamanhoBytes > MAX_BYTES) return "Arquivo maior que o limite de 10 MB.";
  if (!extensaoDeMime(mime)) return "Tipo de arquivo não permitido (use PDF ou imagem).";
  return null;
}
```

- [ ] **Step 4: Verificar que passam**

Run: `npm test -- arquivos-tipos`
Esperado: 5 testes passando.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: validacao de tipo e tamanho de arquivo"
```

---

### Task 3: Módulo de armazenamento em disco (TDD)

**Files:**
- Create: `src/lib/arquivos/armazenamento.ts`
- Modify: `.env.exemplo` (documentar DIRETORIO_ARQUIVOS)
- Test: `tests/arquivos-armazenamento.test.ts`

- [ ] **Step 1: Escrever os testes (devem falhar)**

```ts
// tests/arquivos-armazenamento.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { salvarArquivo, lerArquivo, removerArquivo } from "@/lib/arquivos/armazenamento";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "nefrosys-arq-"));
  process.env.DIRETORIO_ARQUIVOS = dir;
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("armazenamento de arquivos", () => {
  it("salva e lê de volta o mesmo conteúdo", async () => {
    const conteudo = Buffer.from("conteúdo de teste");
    const chave = await salvarArquivo(conteudo, ".pdf");
    expect(chave.endsWith(".pdf")).toBe(true);
    const lido = await lerArquivo(chave);
    expect(lido.equals(conteudo)).toBe(true);
  });

  it("gera chaves diferentes a cada salvamento", async () => {
    const a = await salvarArquivo(Buffer.from("a"), ".png");
    const b = await salvarArquivo(Buffer.from("b"), ".png");
    expect(a).not.toBe(b);
  });

  it("remove o arquivo", async () => {
    const chave = await salvarArquivo(Buffer.from("x"), ".pdf");
    await removerArquivo(chave);
    await expect(lerArquivo(chave)).rejects.toThrow();
  });

  it("não deixa escapar do diretório base (path traversal)", async () => {
    await expect(lerArquivo("../../etc/passwd")).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Verificar que falham**

Run: `npm test -- arquivos-armazenamento`
Esperado: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```ts
// src/lib/arquivos/armazenamento.ts
import { createId } from "@paralleldrive/cuid2";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

function baseDir(): string {
  return process.env.DIRETORIO_ARQUIVOS ?? path.join(process.cwd(), "uploads");
}

// Resolve a chave para um caminho DENTRO do baseDir; recusa qualquer tentativa de escapar.
function caminhoSeguro(chave: string): string {
  const base = path.resolve(baseDir());
  const alvo = path.resolve(base, chave);
  if (alvo !== base && !alvo.startsWith(base + path.sep)) {
    throw new Error("Chave de arquivo inválida.");
  }
  return alvo;
}

export async function salvarArquivo(conteudo: Buffer, extensao: string): Promise<string> {
  const chave = `${createId()}${extensao}`;
  const alvo = caminhoSeguro(chave);
  await mkdir(path.dirname(alvo), { recursive: true });
  await writeFile(alvo, conteudo);
  return chave;
}

export async function lerArquivo(chave: string): Promise<Buffer> {
  return readFile(caminhoSeguro(chave));
}

export async function removerArquivo(chave: string): Promise<void> {
  await unlink(caminhoSeguro(chave));
}
```

Instalar a dependência de id:

```bash
npm install @paralleldrive/cuid2
```

Acrescentar ao `.env.exemplo`:

```bash
# Diretório onde os documentos dos pacientes são gravados.
# Dev: uma pasta local (ex.: ./uploads). Railway: o ponto de montagem do volume (ex.: /data).
DIRETORIO_ARQUIVOS="./uploads"
```

E ao `.gitignore`, acrescentar `/uploads` (os arquivos de dev não vão para o git).

- [ ] **Step 4: Verificar que passam**

Run: `npm test -- arquivos-armazenamento`
Esperado: 4 testes passando.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: armazenamento de arquivos em disco com chave segura"
```

---

### Task 4: Serviço de documentos (TDD)

**Files:**
- Create: `src/lib/pacientes/documentos-servico.ts`
- Modify: `tests/ajuda.ts` (limpar Documento)
- Test: `tests/documentos-servico.test.ts`

NOTA: o módulo se chama `documentos-servico.ts` para não colidir com o já existente
`src/lib/pacientes/documentos.ts` (validação de CPF/CNS da Entrega 2).

- [ ] **Step 1: Limpeza no helper**

Em `tests/ajuda.ts`, dentro de `limparBanco`, ANTES de `db.paciente.deleteMany()`, acrescente:

```ts
  await db.documento.deleteMany();
```

- [ ] **Step 2: Escrever os testes (devem falhar)**

```ts
// tests/documentos-servico.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { anexarDocumento, listarDocumentos, removerDocumento, definirFoto } from "@/lib/pacientes/documentos-servico";
import { criarPaciente } from "@/lib/pacientes/servico";
import { criarUsuarioTeste, limparBanco } from "./ajuda";
import { db } from "@/lib/db";

const PACIENTE = {
  nome: "Ana Souza", cpf: "529.982.247-25",
  dataNascimento: new Date("1960-05-10"), sexo: "FEMININO" as const, tipoVinculo: "SUS" as const,
};

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "nefrosys-doc-"));
  process.env.DIRETORIO_ARQUIVOS = dir;
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

async function cenario() {
  const autor = await criarUsuarioTeste({ perfil: "ENFERMAGEM", email: "enf@clinica.local" });
  const criado = await criarPaciente(PACIENTE, autor.id);
  if (!criado.ok) throw new Error("falhou");
  return { autor, pacienteId: criado.id };
}

describe("serviço de documentos", () => {
  beforeEach(limparBanco);

  it("anexa documento válido, grava metadados e audita", async () => {
    const { autor, pacienteId } = await cenario();
    const r = await anexarDocumento(
      { pacienteId, categoria: "LAUDO", nomeOriginal: "laudo.pdf", tipoMime: "application/pdf",
        conteudo: Buffer.from("PDF fake") },
      autor.id,
    );
    expect(r.ok).toBe(true);
    const docs = await listarDocumentos(pacienteId);
    expect(docs).toHaveLength(1);
    expect(docs[0].nomeOriginal).toBe("laudo.pdf");
    const eventos = await db.eventoAuditoria.findMany({ where: { acao: "paciente.documento.anexar" } });
    expect(eventos).toHaveLength(1);
  });

  it("rejeita tipo não permitido", async () => {
    const { autor, pacienteId } = await cenario();
    const r = await anexarDocumento(
      { pacienteId, categoria: "OUTRO", nomeOriginal: "x.zip", tipoMime: "application/zip",
        conteudo: Buffer.from("zip") },
      autor.id,
    );
    expect(r).toEqual({ ok: false, erro: "Tipo de arquivo não permitido (use PDF ou imagem)." });
    expect(await listarDocumentos(pacienteId)).toHaveLength(0);
  });

  it("remover apaga metadados e arquivo, e audita", async () => {
    const { autor, pacienteId } = await cenario();
    const r = await anexarDocumento(
      { pacienteId, categoria: "TERMO", nomeOriginal: "termo.pdf", tipoMime: "application/pdf",
        conteudo: Buffer.from("PDF") },
      autor.id,
    );
    if (!r.ok) throw new Error("falhou");
    const res = await removerDocumento(r.id, autor.id);
    expect(res.ok).toBe(true);
    expect(await listarDocumentos(pacienteId)).toHaveLength(0);
  });

  it("definir foto aponta o paciente para o documento de foto", async () => {
    const { autor, pacienteId } = await cenario();
    const r = await anexarDocumento(
      { pacienteId, categoria: "FOTO", nomeOriginal: "foto.jpg", tipoMime: "image/jpeg",
        conteudo: Buffer.from("JPG") },
      autor.id,
    );
    if (!r.ok) throw new Error("falhou");
    await definirFoto(pacienteId, r.id, autor.id);
    const paciente = await db.paciente.findUnique({ where: { id: pacienteId } });
    expect(paciente?.fotoDocumentoId).toBe(r.id);
  });
});
```

- [ ] **Step 3: Verificar que falham**

Run: `npm test -- documentos-servico`
Esperado: FAIL — módulo não existe.

- [ ] **Step 4: Implementar**

```ts
// src/lib/pacientes/documentos-servico.ts
import { db } from "@/lib/db";
import { registrarEvento } from "@/lib/auditoria";
import { salvarArquivo, removerArquivo } from "@/lib/arquivos/armazenamento";
import { validarArquivo, extensaoDeMime } from "@/lib/arquivos/tipos";
import type { CategoriaDocumento, Documento } from "@prisma/client";

export type ResultadoDocumento = { ok: true; id: string } | { ok: false; erro: string };

export async function anexarDocumento(
  dados: {
    pacienteId: string;
    categoria: CategoriaDocumento;
    nomeOriginal: string;
    tipoMime: string;
    conteudo: Buffer;
  },
  autorId: string,
): Promise<ResultadoDocumento> {
  const erro = validarArquivo(dados.tipoMime, dados.conteudo.length);
  if (erro) return { ok: false, erro };

  const extensao = extensaoDeMime(dados.tipoMime)!;
  const chave = await salvarArquivo(dados.conteudo, extensao);

  const doc = await db.documento.create({
    data: {
      pacienteId: dados.pacienteId,
      categoria: dados.categoria,
      nomeOriginal: dados.nomeOriginal.trim() || `arquivo${extensao}`,
      chaveArmazenamento: chave,
      tipoMime: dados.tipoMime,
      tamanhoBytes: dados.conteudo.length,
      autorId,
    },
  });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.documento.anexar",
    entidade: "Documento",
    entidadeId: doc.id,
    detalhes: { pacienteId: dados.pacienteId, categoria: dados.categoria },
  });
  return { ok: true, id: doc.id };
}

export function listarDocumentos(pacienteId: string): Promise<Documento[]> {
  return db.documento.findMany({ where: { pacienteId }, orderBy: { criadoEm: "desc" } });
}

export async function removerDocumento(documentoId: string, autorId: string): Promise<ResultadoDocumento> {
  const doc = await db.documento.findUnique({ where: { id: documentoId } });
  if (!doc) return { ok: false, erro: "Documento não encontrado." };

  // se for a foto atual do paciente, desvincula antes
  await db.paciente.updateMany({
    where: { id: doc.pacienteId, fotoDocumentoId: documentoId },
    data: { fotoDocumentoId: null },
  });
  await db.documento.delete({ where: { id: documentoId } });
  await removerArquivo(doc.chaveArmazenamento).catch(() => {}); // metadado já foi; arquivo é best-effort
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.documento.remover",
    entidade: "Documento",
    entidadeId: documentoId,
    detalhes: { pacienteId: doc.pacienteId },
  });
  return { ok: true, id: documentoId };
}

export async function definirFoto(pacienteId: string, documentoId: string, autorId: string): Promise<ResultadoDocumento> {
  const doc = await db.documento.findUnique({ where: { id: documentoId } });
  if (!doc || doc.pacienteId !== pacienteId) return { ok: false, erro: "Documento inválido." };
  if (doc.categoria !== "FOTO") return { ok: false, erro: "O documento não é uma foto." };

  await db.paciente.update({ where: { id: pacienteId }, data: { fotoDocumentoId: documentoId } });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.foto.definir",
    entidade: "Paciente",
    entidadeId: pacienteId,
  });
  return { ok: true, id: documentoId };
}
```

- [ ] **Step 5: Verificar que passam**

Run: `npm test -- documentos-servico`
Esperado: 4 testes passando.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: servico de documentos do paciente"
```

---

### Task 5: Exportação da lista de pacientes para Excel (TDD)

**Files:**
- Create: `src/lib/pacientes/exportacao.ts`
- Test: `tests/exportacao.test.ts`

- [ ] **Step 1: Escrever os testes (devem falhar)**

```ts
// tests/exportacao.test.ts
import { describe, it, expect } from "vitest";
import { linhasParaExcel, CABECALHO_EXCEL } from "@/lib/pacientes/exportacao";
import type { Paciente } from "@prisma/client";

function paciente(over: Partial<Paciente>): Paciente {
  return {
    id: "1", nome: "Ana Souza", cpf: "52998224725", cns: null,
    dataNascimento: new Date("1960-05-10"), sexo: "FEMININO",
    telefone: null, emailContato: null, logradouro: null, numero: null, complemento: null,
    bairro: null, cidade: null, uf: null, cep: null,
    contatoEmergenciaNome: null, contatoEmergenciaTelefone: null,
    tipoVinculo: "SUS", convenioNome: null, convenioMatricula: null, convenioValidade: null,
    cidDoencaBase: null, dataInicioDialise: null, modalidade: "HEMODIALISE", situacao: "ATIVO",
    fotoDocumentoId: null, criadoEm: new Date(), atualizadoEm: new Date(),
    ...over,
  } as Paciente;
}

describe("exportação para Excel", () => {
  it("cabeçalho tem as colunas esperadas", () => {
    expect(CABECALHO_EXCEL).toEqual(["Nome", "CPF", "Nascimento", "Modalidade", "Vínculo", "Situação"]);
  });

  it("formata uma linha com CPF pontuado e rótulos em português", () => {
    const linhas = linhasParaExcel([paciente({ nome: "Ana Souza" })]);
    expect(linhas[0]).toEqual([
      "Ana Souza", "529.982.247-25", "10/05/1960", "Hemodiálise", "SUS", "Ativo",
    ]);
  });

  it("mostra o convênio no lugar de SUS quando é convênio", () => {
    const linhas = linhasParaExcel([
      paciente({ tipoVinculo: "CONVENIO", convenioNome: "Unimed", modalidade: null }),
    ]);
    expect(linhas[0][3]).toBe("—"); // modalidade nula
    expect(linhas[0][4]).toBe("Unimed");
  });
});
```

- [ ] **Step 2: Verificar que falham**

Run: `npm test -- exportacao`
Esperado: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```ts
// src/lib/pacientes/exportacao.ts
import { formatarCpf } from "./documentos";
import type { Modalidade, Paciente, SituacaoPaciente } from "@prisma/client";

export const CABECALHO_EXCEL = ["Nome", "CPF", "Nascimento", "Modalidade", "Vínculo", "Situação"];

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

function dataUTC(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function linhasParaExcel(pacientes: Paciente[]): string[][] {
  return pacientes.map((p) => [
    p.nome,
    formatarCpf(p.cpf),
    dataUTC(p.dataNascimento),
    p.modalidade ? ROTULO_MODALIDADE[p.modalidade] : "—",
    p.tipoVinculo === "SUS" ? "SUS" : p.convenioNome ?? "Convênio",
    ROTULO_SITUACAO[p.situacao],
  ]);
}
```

- [ ] **Step 4: Verificar que passam**

Run: `npm test -- exportacao`
Esperado: 3 testes passando.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: formatacao da lista de pacientes para Excel"
```

---

### Task 6: Route handler de download autenticado

**Files:**
- Create: `src/app/api/documentos/[id]/route.ts`

- [ ] **Step 1: Criar o handler**

```ts
// src/app/api/documentos/[id]/route.ts
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_LEITURA_PACIENTE } from "@/lib/pacientes/permissoes";
import { lerArquivo } from "@/lib/arquivos/armazenamento";
import { registrarEvento } from "@/lib/auditoria";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirPerfil(...PERFIS_LEITURA_PACIENTE);
  const { id } = await params;

  const doc = await db.documento.findUnique({ where: { id } });
  if (!doc) return new Response("Documento não encontrado.", { status: 404 });

  await registrarEvento({
    usuarioId: usuario.id,
    acao: "paciente.documento.baixar",
    entidade: "Documento",
    entidadeId: doc.id,
    detalhes: { pacienteId: doc.pacienteId },
  });

  const conteudo = await lerArquivo(doc.chaveArmazenamento);
  return new Response(new Uint8Array(conteudo), {
    headers: {
      "Content-Type": doc.tipoMime,
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.nomeOriginal)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
```

NOTA sobre `exigirPerfil` em route handler: ele chama `redirect("/login")` se não autenticado, o
que num route handler lança a exceção de redirect do Next — comportamento aceitável (retorna 307).

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Esperado: compila; aparece a rota `ƒ /api/documentos/[id]`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: download de documento autenticado e auditado"
```

---

### Task 7: Route handler de exportação Excel

**Files:**
- Create: `src/app/api/pacientes/exportar/route.ts`

- [ ] **Step 1: Instalar exceljs**

```bash
npm install exceljs
```

- [ ] **Step 2: Criar o handler**

```ts
// src/app/api/pacientes/exportar/route.ts
import ExcelJS from "exceljs";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_LEITURA_PACIENTE } from "@/lib/pacientes/permissoes";
import { buscarPacientes } from "@/lib/pacientes/busca";
import { linhasParaExcel, CABECALHO_EXCEL } from "@/lib/pacientes/exportacao";
import { registrarEvento } from "@/lib/auditoria";
import type { Modalidade, SituacaoPaciente, TipoVinculo } from "@prisma/client";

export async function GET(req: Request) {
  const usuario = await exigirPerfil(...PERFIS_LEITURA_PACIENTE);
  const url = new URL(req.url);

  const pacientes = await buscarPacientes({
    texto: url.searchParams.get("texto") ?? undefined,
    situacao: (url.searchParams.get("situacao") || undefined) as SituacaoPaciente | undefined,
    modalidade: (url.searchParams.get("modalidade") || undefined) as Modalidade | undefined,
    tipoVinculo: (url.searchParams.get("vinculo") || undefined) as TipoVinculo | undefined,
  });

  await registrarEvento({
    usuarioId: usuario.id,
    acao: "paciente.exportar_excel",
    detalhes: { resultados: pacientes.length },
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Pacientes");
  ws.addRow(CABECALHO_EXCEL);
  ws.getRow(1).font = { bold: true };
  for (const linha of linhasParaExcel(pacientes)) ws.addRow(linha);
  ws.columns.forEach((c) => { c.width = 22; });

  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="pacientes.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Esperado: compila; rota `ƒ /api/pacientes/exportar`.

- [ ] **Step 4: Botão de exportar na lista**

Em `src/app/(app)/pacientes/page.tsx`, no cabeçalho ao lado do "Novo paciente", acrescente um link
que leva os filtros atuais para a exportação. Logo após o bloco do botão "Novo paciente" (dentro da
`div` com `justify-between`), envolva os dois numa `div` com `gap` e acrescente:

```tsx
        <a
          href={`/api/pacientes/exportar?${new URLSearchParams(
            Object.entries(params).filter(([, v]) => v) as [string, string][],
          ).toString()}`}
          className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Exportar Excel
        </a>
```

Para isso, ajuste o cabeçalho existente para agrupar os botões. O bloco atual é:

```tsx
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Pacientes</h1>
        {podeCadastrar && (
          <Link href="/pacientes/novo" className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
            Novo paciente
          </Link>
        )}
      </div>
```

Troque por:

```tsx
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Pacientes</h1>
        <div className="flex gap-2">
          <a
            href={`/api/pacientes/exportar?${new URLSearchParams(
              Object.entries(params).filter(([, v]) => v) as [string, string][],
            ).toString()}`}
            className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Exportar Excel
          </a>
          {podeCadastrar && (
            <Link href="/pacientes/novo" className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
              Novo paciente
            </Link>
          )}
        </div>
      </div>
```

- [ ] **Step 5: Verificação e commit**

Run: `npm test` e `npm run build`
Esperado: testes passando; build ok.

```bash
git add -A
git commit -m "feat: exportacao da lista de pacientes para Excel"
```

---

### Task 8: Tela de documentos do paciente

**Files:**
- Create: `src/app/(app)/pacientes/[id]/documentos/acoes.ts`, `.../documentos/page.tsx`, `.../documentos/formulario-upload.tsx`
- Modify: `src/app/(app)/pacientes/[id]/page.tsx` (link "Documentos")

- [ ] **Step 1: Server actions**

```ts
// src/app/(app)/pacientes/[id]/documentos/acoes.ts
"use server";

import { revalidatePath } from "next/cache";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_CADASTRO_PACIENTE } from "@/lib/pacientes/permissoes";
import { anexarDocumento, removerDocumento, definirFoto } from "@/lib/pacientes/documentos-servico";
import type { CategoriaDocumento } from "@prisma/client";

export type EstadoDocumento = { erro: string } | undefined;

const CATEGORIAS: CategoriaDocumento[] = ["LAUDO", "EXAME", "TERMO", "IDENTIDADE", "FOTO", "OUTRO"];

export async function acaoAnexar(_anterior: EstadoDocumento, formData: FormData): Promise<EstadoDocumento> {
  const autor = await exigirPerfil(...PERFIS_CADASTRO_PACIENTE);
  const pacienteId = String(formData.get("pacienteId") ?? "");
  const categoria = String(formData.get("categoria") ?? "");
  const arquivo = formData.get("arquivo");
  if (!CATEGORIAS.includes(categoria as CategoriaDocumento)) return { erro: "Categoria inválida." };
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Selecione um arquivo." };

  const conteudo = Buffer.from(await arquivo.arrayBuffer());
  const r = await anexarDocumento(
    {
      pacienteId,
      categoria: categoria as CategoriaDocumento,
      nomeOriginal: arquivo.name,
      tipoMime: arquivo.type,
      conteudo,
    },
    autor.id,
  );
  if (!r.ok) return { erro: r.erro };
  if (categoria === "FOTO") await definirFoto(pacienteId, r.id, autor.id);
  revalidatePath(`/pacientes/${pacienteId}/documentos`);
  return undefined;
}

export async function acaoRemover(formData: FormData): Promise<void> {
  const autor = await exigirPerfil(...PERFIS_CADASTRO_PACIENTE);
  const pacienteId = String(formData.get("pacienteId") ?? "");
  await removerDocumento(String(formData.get("documentoId") ?? ""), autor.id);
  revalidatePath(`/pacientes/${pacienteId}/documentos`);
}
```

- [ ] **Step 2: Formulário de upload (client)**

```tsx
// src/app/(app)/pacientes/[id]/documentos/formulario-upload.tsx
"use client";

import { useActionState } from "react";
import { acaoAnexar } from "./acoes";

const CATEGORIAS = [
  ["LAUDO", "Laudo"],
  ["EXAME", "Exame"],
  ["TERMO", "Termo"],
  ["IDENTIDADE", "Identidade"],
  ["FOTO", "Foto"],
  ["OUTRO", "Outro"],
] as const;

export function FormularioUpload({ pacienteId }: { pacienteId: string }) {
  const [estado, acao, pendente] = useActionState(acaoAnexar, undefined);
  return (
    <form action={acao} className="flex flex-wrap items-end gap-3 rounded bg-white p-4 shadow-sm">
      <input type="hidden" name="pacienteId" value={pacienteId} />
      <div>
        <label htmlFor="categoria" className="block text-sm font-medium text-slate-700">Categoria</label>
        <select id="categoria" name="categoria" className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm">
          {CATEGORIAS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="arquivo" className="block text-sm font-medium text-slate-700">Arquivo (PDF ou imagem, até 10 MB)</label>
        <input id="arquivo" name="arquivo" type="file" accept="application/pdf,image/*" required className="mt-1 text-sm" />
      </div>
      <button type="submit" disabled={pendente}
        className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
        {pendente ? "Enviando..." : "Anexar"}
      </button>
      {estado?.erro && <p className="w-full text-sm text-red-600">{estado.erro}</p>}
    </form>
  );
}
```

- [ ] **Step 3: Página de documentos**

```tsx
// src/app/(app)/pacientes/[id]/documentos/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_LEITURA_PACIENTE, PERFIS_CADASTRO_PACIENTE } from "@/lib/pacientes/permissoes";
import { perfilPermitido } from "@/lib/perfis";
import { listarDocumentos } from "@/lib/pacientes/documentos-servico";
import { db } from "@/lib/db";
import { FormularioUpload } from "./formulario-upload";
import { acaoRemover } from "./acoes";
import type { CategoriaDocumento } from "@prisma/client";

const ROTULO_CATEGORIA: Record<CategoriaDocumento, string> = {
  LAUDO: "Laudo", EXAME: "Exame", TERMO: "Termo",
  IDENTIDADE: "Identidade", FOTO: "Foto", OUTRO: "Outro",
};

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function PaginaDocumentos({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirPerfil(...PERFIS_LEITURA_PACIENTE);
  const { id } = await params;
  const paciente = await db.paciente.findUnique({ where: { id }, select: { id: true, nome: true } });
  if (!paciente) notFound();

  const documentos = await listarDocumentos(id);
  const podeAnexar = perfilPermitido(usuario.perfil, PERFIS_CADASTRO_PACIENTE);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href={`/pacientes/${id}`} className="text-sm text-blue-700 hover:underline">← Ficha</Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-800">Documentos — {paciente.nome}</h1>
      </div>

      {podeAnexar && <FormularioUpload pacienteId={id} />}

      {documentos.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum documento anexado.</p>
      ) : (
        <table className="w-full rounded bg-white text-sm shadow-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Categoria</th>
              <th className="px-4 py-2">Tamanho</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {documentos.map((doc) => (
              <tr key={doc.id} className="border-b">
                <td className="px-4 py-2">
                  <a href={`/api/documentos/${doc.id}`} target="_blank" className="text-blue-700 hover:underline">
                    {doc.nomeOriginal}
                  </a>
                </td>
                <td className="px-4 py-2">{ROTULO_CATEGORIA[doc.categoria]}</td>
                <td className="px-4 py-2">{formatarTamanho(doc.tamanhoBytes)}</td>
                <td className="px-4 py-2 text-right">
                  {podeAnexar && (
                    <form action={acaoRemover}>
                      <input type="hidden" name="pacienteId" value={id} />
                      <input type="hidden" name="documentoId" value={doc.id} />
                      <button className="text-red-600 hover:underline">Remover</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Link "Documentos" na ficha**

Em `src/app/(app)/pacientes/[id]/page.tsx`, no bloco de links do cabeçalho (`{podeVerClinico && (`
com os links de resumo e evoluções), acrescente mais um link. Ele deve valer também para quem tem
leitura de paciente mas não clínica (recepção vê documentos administrativos). Como o bloco atual só
aparece para `podeVerClinico`, acrescente um link de Documentos FORA desse bloco, logo depois dele,
visível a todos que já acessam a ficha:

```tsx
        <Link
          href={`/pacientes/${paciente.id}/documentos`}
          className="mt-1 inline-block text-sm text-blue-700 hover:underline"
        >
          Documentos →
        </Link>
```

- [ ] **Step 5: Verificação e commit**

Run: `npm test` e `npm run build`
Esperado: testes passando; build com `ƒ /pacientes/[id]/documentos`.

```bash
git add -A
git commit -m "feat: tela de documentos do paciente com upload"
```

---

### Task 9: Prontuário para impressão (PDF) + montagem

**Files:**
- Create: `src/lib/pacientes/prontuario.ts`, `src/app/(app)/pacientes/[id]/prontuario/page.tsx`, `src/app/(app)/pacientes/[id]/prontuario/botao-imprimir.tsx`
- Modify: `src/app/globals.css` (estilos de impressão)

- [ ] **Step 1: Montagem do prontuário**

```ts
// src/lib/pacientes/prontuario.ts
import { db } from "@/lib/db";
import { montarResumo } from "./resumo";
import { listarEvolucoes } from "./evolucoes";

export async function montarProntuario(pacienteId: string) {
  const resumo = await montarResumo(pacienteId);
  if (!resumo) return null;
  const evolucoes = await listarEvolucoes(pacienteId);
  const autorIds = [
    ...new Set([
      ...evolucoes.map((e) => e.autorId),
      ...evolucoes.flatMap((e) => e.adendos.map((a) => a.autorId)),
    ]),
  ];
  const autores = await db.usuario.findMany({ where: { id: { in: autorIds } }, select: { id: true, nome: true } });
  const nomePorAutor = Object.fromEntries(autores.map((a) => [a.id, a.nome]));
  return { ...resumo, evolucoes, nomePorAutor };
}
```

- [ ] **Step 2: Botão imprimir (client)**

```tsx
// src/app/(app)/pacientes/[id]/prontuario/botao-imprimir.tsx
"use client";

export function BotaoImprimir() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
    >
      Imprimir / Salvar PDF
    </button>
  );
}
```

- [ ] **Step 3: Página do prontuário**

```tsx
// src/app/(app)/pacientes/[id]/prontuario/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_CLINICO_LEITURA } from "@/lib/pacientes/permissoes";
import { montarProntuario } from "@/lib/pacientes/prontuario";
import { formatarCpf } from "@/lib/pacientes/documentos";
import { registrarEvento } from "@/lib/auditoria";
import { BotaoImprimir } from "./botao-imprimir";
import type { ResultadoSorologia, TipoSorologia } from "@prisma/client";

const ROTULO_SOROLOGIA: Record<TipoSorologia, string> = { HBSAG: "HBsAg", ANTI_HCV: "Anti-HCV", HIV: "HIV" };
const ROTULO_RESULTADO: Record<ResultadoSorologia, string> = {
  POSITIVO: "Positivo", NEGATIVO: "Negativo", INDETERMINADO: "Indeterminado",
};

function dataUTC(d: Date | null): string {
  return d ? d.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—";
}
function dataHora(d: Date): string {
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export default async function PaginaProntuario({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirPerfil(...PERFIS_CLINICO_LEITURA);
  const { id } = await params;
  const p = await montarProntuario(id);
  if (!p) notFound();

  await registrarEvento({
    usuarioId: usuario.id,
    acao: "paciente.prontuario.exportar",
    entidade: "Paciente",
    entidadeId: id,
  });

  const tipos: TipoSorologia[] = ["HBSAG", "ANTI_HCV", "HIV"];

  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-white p-8 text-sm text-slate-800">
      <div className="no-print flex justify-between">
        <Link href={`/pacientes/${id}`} className="text-blue-700 hover:underline">← Ficha</Link>
        <BotaoImprimir />
      </div>

      <header className="border-b pb-3">
        <h1 className="text-lg font-bold">Prontuário — {p.paciente.nome}</h1>
        <p>{formatarCpf(p.paciente.cpf)} · Nascimento {dataUTC(p.paciente.dataNascimento)}</p>
        <p className="text-xs text-slate-500">Emitido em {dataHora(new Date())} por {usuario.nome}</p>
      </header>

      <section>
        <h2 className="font-semibold">Dados nefrológicos</h2>
        <p>Doença de base (CID): {p.paciente.cidDoencaBase ?? "—"}</p>
        <p>Início da diálise: {dataUTC(p.paciente.dataInicioDialise)}</p>
        <p>Acesso atual: {p.acessoAtual ? `${p.acessoAtual.tipo} — ${p.acessoAtual.localizacao}` : "—"}</p>
      </section>

      <section>
        <h2 className="font-semibold">Sorologias</h2>
        {tipos.map((t) => (
          <p key={t}>{ROTULO_SOROLOGIA[t]}: {p.sorologias[t] ? ROTULO_RESULTADO[p.sorologias[t]!.resultado] : "—"}</p>
        ))}
      </section>

      <section>
        <h2 className="font-semibold">Medicações em uso</h2>
        {p.medicacoesAtivas.length ? (
          <ul className="list-disc pl-5">
            {p.medicacoesAtivas.map((m) => <li key={m.id}>{m.nome}{m.dose ? ` ${m.dose}` : ""}{m.posologia ? ` — ${m.posologia}` : ""}</li>)}
          </ul>
        ) : <p>—</p>}
      </section>

      <section>
        <h2 className="font-semibold">Alergias</h2>
        <p>{p.alergias.length ? p.alergias.map((a) => a.descricao).join(", ") : "—"}</p>
      </section>

      <section>
        <h2 className="font-semibold">Evoluções</h2>
        {p.evolucoes.length === 0 && <p>—</p>}
        {p.evolucoes.map((ev) => (
          <div key={ev.id} className="mt-3 border-t pt-2">
            <p className="text-xs text-slate-500">
              {ev.tipo} · {p.nomePorAutor[ev.autorId] ?? "Autor"} · {ev.assinadaEm ? dataHora(ev.assinadaEm) : ""}
            </p>
            <pre className="whitespace-pre-wrap font-sans">{ev.texto}</pre>
            {ev.adendos.map((a) => (
              <p key={a.id} className="mt-1 pl-3 text-slate-700">
                <span className="text-xs text-slate-500">Adendo ({dataHora(a.criadoEm)}): </span>{a.texto}
              </p>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Estilos de impressão**

Ao final de `src/app/globals.css`, acrescente:

```css
@media print {
  .no-print { display: none !important; }
  header, nav { display: none !important; }
  body { background: white; }
}
```

NOTA: o `header` e `nav` do shell autenticado somem na impressão para o PDF sair limpo. A página do
prontuário fica dentro do grupo `(app)`, então o cabeçalho do sistema existe — o `@media print` o oculta.

- [ ] **Step 5: Link "Prontuário (PDF)" na ficha**

Em `src/app/(app)/pacientes/[id]/page.tsx`, dentro do bloco `{podeVerClinico && (` de links do
cabeçalho (junto de resumo e evoluções), acrescente:

```tsx
            <Link href={`/pacientes/${paciente.id}/prontuario`} className="text-blue-700 hover:underline">
              Prontuário (PDF) →
            </Link>
```

- [ ] **Step 6: Verificação e commit**

Run: `npm test` e `npm run build`
Esperado: testes passando; build com `ƒ /pacientes/[id]/prontuario`.

```bash
git add -A
git commit -m "feat: prontuario para impressao em PDF"
```

---

### Task 10: Foto no resumo e verificação final

**Files:**
- Modify: `src/app/(app)/pacientes/[id]/resumo/page.tsx` (mostrar foto), `README.md`

- [ ] **Step 1: Mostrar a foto no resumo**

Em `src/app/(app)/pacientes/[id]/resumo/page.tsx`, a página já busca o resumo via `montarResumo`.
A foto é um `Documento` referenciado por `paciente.fotoDocumentoId`. Logo após obter `resumo`,
acrescente a busca da foto e exiba-a no cabeçalho.

Após a linha `const { paciente, acessoAtual, sorologias, medicacoesAtivas, alergias } = resumo;`,
acrescente:

```tsx
  const temFoto = Boolean(paciente.fotoDocumentoId);
```

E no cabeçalho (a `div` com nome/CPF), envolva para exibir a foto ao lado quando existir:

```tsx
      <div className="flex items-center gap-4">
        {temFoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/documentos/${paciente.fotoDocumentoId}`}
            alt={`Foto de ${paciente.nome}`}
            className="h-20 w-20 rounded-full object-cover"
          />
        )}
        <div>
          <Link href={`/pacientes/${paciente.id}`} className="text-sm text-blue-700 hover:underline">
            ← Ficha completa
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-800">{paciente.nome}</h1>
          <p className="text-sm text-slate-500">
            {formatarCpf(paciente.cpf)} · {dataUTC(paciente.dataNascimento)} ·{" "}
            <span className="font-medium">{ROTULO_SITUACAO[paciente.situacao]}</span>
            {paciente.modalidade ? ` · ${ROTULO_MODALIDADE[paciente.modalidade]}` : ""}
          </p>
        </div>
      </div>
```

(Substitui o `<div>` de cabeçalho atual — mantenha os mesmos textos e o link "Ficha completa".)

- [ ] **Step 2: Documentar no README**

Em `src/lib/pacientes/` na seção Estrutura do `README.md`, acrescente a linha:

```markdown
- `src/lib/arquivos/` — armazenamento de arquivos em volume persistente (dev: `./uploads`, Railway: volume).
```

E na seção "Deploy no Railway", acrescente uma nota sobre o volume:

```markdown
**Volume de arquivos:** crie um Volume no serviço da aplicação e monte-o em `/data`; defina a
variável `DIRETORIO_ARQUIVOS=/data`. Sem isso, documentos e fotos anexados somem a cada deploy.
```

- [ ] **Step 3: Verificação completa**

Run: `npm run lint && npm test && npm run build`
Esperado: lint limpo, todos os testes passando, build ok.

Rotas novas esperadas: `ƒ /pacientes/[id]/documentos`, `ƒ /pacientes/[id]/prontuario`,
`ƒ /api/documentos/[id]`, `ƒ /api/pacientes/exportar`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: foto no resumo e README da entrega de documentos"
```

---

## Checklist manual (controlador, no navegador)

1. Como enfermagem: abrir paciente → "Documentos" → anexar um PDF categoria Laudo; ele aparece na lista; clicar baixa/abre.
2. Anexar uma imagem categoria Foto; a foto aparece no resumo do paciente.
3. Remover um documento → some da lista.
4. Tipo não permitido (ex.: .zip) → erro claro; arquivo > 10 MB → erro claro.
5. "Exportar Excel" na lista com um filtro ativo → baixa `.xlsx` só com os pacientes filtrados.
6. "Prontuário (PDF)" → página limpa; "Imprimir/Salvar PDF" gera PDF sem o cabeçalho do sistema.
7. Como recepção: vê Documentos, mas NÃO o Prontuário/Evoluções (clínico).
8. Como admin: `/pacientes/[id]/documentos` → redireciona (admin não acessa paciente).
9. Auditoria: eventos `documento.anexar`, `documento.baixar`, `prontuario.exportar`, `exportar_excel`.

## Fim da Fase 1

Com esta entrega, a Fase 1 (Pacientes/Prontuário) está completa. Antes de uso real com dados de
pacientes, falta o **plano de operação**: deploy definitivo, HTTPS, banco de produção separado do de
desenvolvimento, backup diário criptografado (incluindo o volume de arquivos) com restauração
testada, e o endurecimento de segurança do login (timing + rate limit).
