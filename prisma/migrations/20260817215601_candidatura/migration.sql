-- CreateTable
CREATE TABLE "Candidatura" (
    "id" TEXT NOT NULL,
    "parlamentarId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "cargo" TEXT NOT NULL,
    "situacao" TEXT,
    "resultado" TEXT,
    "patrimonio" DOUBLE PRECISION,

    CONSTRAINT "Candidatura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Candidatura_parlamentarId_idx" ON "Candidatura"("parlamentarId");

-- CreateIndex
CREATE UNIQUE INDEX "Candidatura_parlamentarId_ano_key" ON "Candidatura"("parlamentarId", "ano");

-- AddForeignKey
ALTER TABLE "Candidatura" ADD CONSTRAINT "Candidatura_parlamentarId_fkey" FOREIGN KEY ("parlamentarId") REFERENCES "Parlamentar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
