-- CreateEnum
CREATE TYPE "TipoEvolucao" AS ENUM ('MEDICA', 'ENFERMAGEM', 'NUTRICAO', 'PSICOLOGIA', 'SERVICO_SOCIAL');

-- CreateTable
CREATE TABLE "Evolucao" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "tipo" "TipoEvolucao" NOT NULL,
    "texto" TEXT NOT NULL DEFAULT '',
    "assinadaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evolucao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Adendo" (
    "id" TEXT NOT NULL,
    "evolucaoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Adendo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Evolucao_pacienteId_assinadaEm_idx" ON "Evolucao"("pacienteId", "assinadaEm");

-- CreateIndex
CREATE INDEX "Evolucao_autorId_idx" ON "Evolucao"("autorId");

-- CreateIndex
CREATE INDEX "Adendo_evolucaoId_idx" ON "Adendo"("evolucaoId");

-- AddForeignKey
ALTER TABLE "Evolucao" ADD CONSTRAINT "Evolucao_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adendo" ADD CONSTRAINT "Adendo_evolucaoId_fkey" FOREIGN KEY ("evolucaoId") REFERENCES "Evolucao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
