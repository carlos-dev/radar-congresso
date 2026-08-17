-- CreateTable
CREATE TABLE "Doacao" (
    "id" TEXT NOT NULL,
    "parlamentarId" TEXT NOT NULL,
    "doadorNome" TEXT NOT NULL,
    "doadorDoc" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "ano" INTEGER NOT NULL,
    "cargo" TEXT,

    CONSTRAINT "Doacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorecido" (
    "id" TEXT NOT NULL,
    "parlamentarId" TEXT NOT NULL,
    "codigoEmenda" TEXT NOT NULL,
    "doc" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipoPessoa" TEXT NOT NULL,
    "valorPago" DOUBLE PRECISION NOT NULL,
    "ano" INTEGER NOT NULL,

    CONSTRAINT "Favorecido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Socio" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "doc" TEXT NOT NULL,

    CONSTRAINT "Socio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conexao" (
    "id" TEXT NOT NULL,
    "parlamentarId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "doadorNome" TEXT NOT NULL,
    "doadorDoc" TEXT NOT NULL,
    "empresaCnpj" TEXT,
    "empresaNome" TEXT,
    "valorDoacao" DOUBLE PRECISION NOT NULL,
    "valorEmenda" DOUBLE PRECISION NOT NULL,
    "ano" INTEGER NOT NULL,
    "confianca" TEXT NOT NULL,

    CONSTRAINT "Conexao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Doacao_parlamentarId_idx" ON "Doacao"("parlamentarId");

-- CreateIndex
CREATE INDEX "Favorecido_parlamentarId_idx" ON "Favorecido"("parlamentarId");

-- CreateIndex
CREATE INDEX "Favorecido_doc_idx" ON "Favorecido"("doc");

-- CreateIndex
CREATE INDEX "Socio_cnpj_idx" ON "Socio"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Socio_cnpj_doc_nome_key" ON "Socio"("cnpj", "doc", "nome");

-- CreateIndex
CREATE INDEX "Conexao_parlamentarId_idx" ON "Conexao"("parlamentarId");

-- AddForeignKey
ALTER TABLE "Doacao" ADD CONSTRAINT "Doacao_parlamentarId_fkey" FOREIGN KEY ("parlamentarId") REFERENCES "Parlamentar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorecido" ADD CONSTRAINT "Favorecido_parlamentarId_fkey" FOREIGN KEY ("parlamentarId") REFERENCES "Parlamentar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conexao" ADD CONSTRAINT "Conexao_parlamentarId_fkey" FOREIGN KEY ("parlamentarId") REFERENCES "Parlamentar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
