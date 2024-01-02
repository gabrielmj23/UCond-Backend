-- AlterTable
ALTER TABLE "Pago" ADD COLUMN     "confirmado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Vivienda" ADD COLUMN     "ocupada" BOOLEAN NOT NULL DEFAULT false;
