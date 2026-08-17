-- AlterTable
ALTER TABLE "Votacao" ADD COLUMN     "destaque" BOOLEAN,
ADD COLUMN     "tipo" TEXT,
ADD COLUMN     "votosNao" INTEGER,
ADD COLUMN     "votosOutros" INTEGER,
ADD COLUMN     "votosSim" INTEGER;
