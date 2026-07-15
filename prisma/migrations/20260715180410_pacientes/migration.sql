-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('FEMININO', 'MASCULINO', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoVinculo" AS ENUM ('SUS', 'CONVENIO');

-- CreateEnum
CREATE TYPE "Modalidade" AS ENUM ('HEMODIALISE', 'DIALISE_PERITONEAL');

-- CreateEnum
CREATE TYPE "SituacaoPaciente" AS ENUM ('ATIVO', 'TRANSPLANTADO', 'OBITO', 'TRANSFERIDO', 'EM_TRANSITO');

-- CreateTable
CREATE TABLE "Paciente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "cns" TEXT,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "sexo" "Sexo" NOT NULL,
    "telefone" TEXT,
    "emailContato" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "cep" TEXT,
    "contatoEmergenciaNome" TEXT,
    "contatoEmergenciaTelefone" TEXT,
    "tipoVinculo" "TipoVinculo" NOT NULL,
    "convenioNome" TEXT,
    "convenioMatricula" TEXT,
    "convenioValidade" TIMESTAMP(3),
    "cidDoencaBase" TEXT,
    "dataInicioDialise" TIMESTAMP(3),
    "modalidade" "Modalidade",
    "situacao" "SituacaoPaciente" NOT NULL DEFAULT 'ATIVO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MudancaSituacao" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "de" "SituacaoPaciente",
    "para" "SituacaoPaciente" NOT NULL,
    "motivo" TEXT,
    "registradoPorId" TEXT,
    "registradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MudancaSituacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_cpf_key" ON "Paciente"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_cns_key" ON "Paciente"("cns");

-- CreateIndex
CREATE INDEX "Paciente_nome_idx" ON "Paciente"("nome");

-- CreateIndex
CREATE INDEX "Paciente_situacao_idx" ON "Paciente"("situacao");

-- CreateIndex
CREATE INDEX "Paciente_modalidade_idx" ON "Paciente"("modalidade");

-- CreateIndex
CREATE INDEX "MudancaSituacao_pacienteId_idx" ON "MudancaSituacao"("pacienteId");

-- AddForeignKey
ALTER TABLE "MudancaSituacao" ADD CONSTRAINT "MudancaSituacao_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
