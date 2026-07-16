-- CreateEnum
CREATE TYPE "TipoAcesso" AS ENUM ('FISTULA', 'CATETER', 'PROTESE');

-- CreateEnum
CREATE TYPE "SituacaoAcesso" AS ENUM ('EM_USO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "TipoSorologia" AS ENUM ('HBSAG', 'ANTI_HCV', 'HIV');

-- CreateEnum
CREATE TYPE "ResultadoSorologia" AS ENUM ('POSITIVO', 'NEGATIVO', 'INDETERMINADO');

-- CreateTable
CREATE TABLE "AcessoVascular" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "tipo" "TipoAcesso" NOT NULL,
    "localizacao" TEXT NOT NULL,
    "dataConfeccao" TIMESTAMP(3) NOT NULL,
    "situacao" "SituacaoAcesso" NOT NULL DEFAULT 'EM_USO',
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcessoVascular_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sorologia" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "tipo" "TipoSorologia" NOT NULL,
    "resultado" "ResultadoSorologia" NOT NULL,
    "dataExame" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sorologia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicacao" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dose" TEXT,
    "posologia" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "suspensaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Medicacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alergia" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alergia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcessoVascular_pacienteId_idx" ON "AcessoVascular"("pacienteId");

-- CreateIndex
CREATE INDEX "Sorologia_pacienteId_idx" ON "Sorologia"("pacienteId");

-- CreateIndex
CREATE INDEX "Medicacao_pacienteId_idx" ON "Medicacao"("pacienteId");

-- CreateIndex
CREATE INDEX "Alergia_pacienteId_idx" ON "Alergia"("pacienteId");

-- AddForeignKey
ALTER TABLE "AcessoVascular" ADD CONSTRAINT "AcessoVascular_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sorologia" ADD CONSTRAINT "Sorologia_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicacao" ADD CONSTRAINT "Medicacao_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alergia" ADD CONSTRAINT "Alergia_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
