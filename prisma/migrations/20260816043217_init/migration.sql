-- CreateEnum
CREATE TYPE "Casa" AS ENUM ('CAMARA', 'SENADO');

-- CreateEnum
CREATE TYPE "Voto" AS ENUM ('SIM', 'NAO', 'ABSTENCAO', 'OBSTRUCAO', 'AUSENTE');

-- CreateTable
CREATE TABLE "Parlamentar" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "casa" "Casa" NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeCivil" TEXT,
    "partido" TEXT,
    "uf" TEXT,
    "cargo" TEXT,
    "urlFoto" TEXT,

    CONSTRAINT "Parlamentar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Despesa" (
    "id" TEXT NOT NULL,
    "parlamentarId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "fornecedorNome" TEXT NOT NULL,
    "fornecedorDoc" TEXT,
    "valor" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Despesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Votacao" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "Votacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VotoRegistro" (
    "id" TEXT NOT NULL,
    "votacaoId" TEXT NOT NULL,
    "parlamentarId" TEXT NOT NULL,
    "voto" "Voto" NOT NULL,

    CONSTRAINT "VotoRegistro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposicao" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "parlamentarId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "ementa" TEXT NOT NULL,
    "virouLei" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Proposicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Emenda" (
    "id" TEXT NOT NULL,
    "parlamentarId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "funcao" TEXT,
    "municipioBeneficiario" TEXT,
    "uf" TEXT,
    "beneficiarioDoc" TEXT,
    "valorEmpenhado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorPago" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Emenda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Parlamentar_casa_externalId_key" ON "Parlamentar"("casa", "externalId");

-- CreateIndex
CREATE INDEX "Despesa_parlamentarId_ano_idx" ON "Despesa"("parlamentarId", "ano");

-- CreateIndex
CREATE UNIQUE INDEX "Votacao_externalId_key" ON "Votacao"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "VotoRegistro_votacaoId_parlamentarId_key" ON "VotoRegistro"("votacaoId", "parlamentarId");

-- CreateIndex
CREATE UNIQUE INDEX "Proposicao_externalId_key" ON "Proposicao"("externalId");

-- CreateIndex
CREATE INDEX "Proposicao_parlamentarId_idx" ON "Proposicao"("parlamentarId");

-- CreateIndex
CREATE INDEX "Emenda_parlamentarId_ano_idx" ON "Emenda"("parlamentarId", "ano");

-- AddForeignKey
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_parlamentarId_fkey" FOREIGN KEY ("parlamentarId") REFERENCES "Parlamentar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotoRegistro" ADD CONSTRAINT "VotoRegistro_votacaoId_fkey" FOREIGN KEY ("votacaoId") REFERENCES "Votacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotoRegistro" ADD CONSTRAINT "VotoRegistro_parlamentarId_fkey" FOREIGN KEY ("parlamentarId") REFERENCES "Parlamentar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposicao" ADD CONSTRAINT "Proposicao_parlamentarId_fkey" FOREIGN KEY ("parlamentarId") REFERENCES "Parlamentar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Emenda" ADD CONSTRAINT "Emenda_parlamentarId_fkey" FOREIGN KEY ("parlamentarId") REFERENCES "Parlamentar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
