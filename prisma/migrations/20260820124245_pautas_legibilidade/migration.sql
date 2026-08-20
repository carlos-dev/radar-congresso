-- AlterEnum
ALTER TYPE "Voto" ADD VALUE 'SIGILOSO';

-- AlterTable
ALTER TABLE "Votacao" ADD COLUMN     "legibilidadeRevisada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resumoCidadao" TEXT,
ADD COLUMN     "secreta" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "significadoNao" TEXT,
ADD COLUMN     "significadoSim" TEXT;
