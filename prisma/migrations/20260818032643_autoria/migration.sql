/*
  Warnings:

  - You are about to drop the column `parlamentarId` on the `Proposicao` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Proposicao" DROP CONSTRAINT "Proposicao_parlamentarId_fkey";

-- DropIndex
DROP INDEX "Proposicao_parlamentarId_idx";

-- AlterTable
ALTER TABLE "Proposicao" DROP COLUMN "parlamentarId";

-- CreateTable
CREATE TABLE "Autoria" (
    "id" TEXT NOT NULL,
    "proposicaoId" TEXT NOT NULL,
    "parlamentarId" TEXT NOT NULL,
    "principal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Autoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Autoria_parlamentarId_principal_idx" ON "Autoria"("parlamentarId", "principal");

-- CreateIndex
CREATE UNIQUE INDEX "Autoria_proposicaoId_parlamentarId_key" ON "Autoria"("proposicaoId", "parlamentarId");

-- CreateIndex
CREATE INDEX "Proposicao_ano_idx" ON "Proposicao"("ano");

-- AddForeignKey
ALTER TABLE "Autoria" ADD CONSTRAINT "Autoria_proposicaoId_fkey" FOREIGN KEY ("proposicaoId") REFERENCES "Proposicao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Autoria" ADD CONSTRAINT "Autoria_parlamentarId_fkey" FOREIGN KEY ("parlamentarId") REFERENCES "Parlamentar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
