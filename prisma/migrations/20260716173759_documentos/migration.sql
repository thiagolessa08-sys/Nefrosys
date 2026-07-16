-- CreateEnum
CREATE TYPE "CategoriaDocumento" AS ENUM ('LAUDO', 'EXAME', 'TERMO', 'IDENTIDADE', 'FOTO', 'OUTRO');

-- AlterTable
ALTER TABLE "Paciente" ADD COLUMN     "fotoDocumentoId" TEXT;

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "categoria" "CategoriaDocumento" NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "chaveArmazenamento" TEXT NOT NULL,
    "tipoMime" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "autorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Documento_chaveArmazenamento_key" ON "Documento"("chaveArmazenamento");

-- CreateIndex
CREATE INDEX "Documento_pacienteId_categoria_idx" ON "Documento"("pacienteId", "categoria");

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
