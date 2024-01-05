/*
  Warnings:

  - You are about to drop the column `cedula_usuario` on the `Deuda` table. All the data in the column will be lost.
  - You are about to drop the column `id_usuario` on the `Deuda` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id_vivienda]` on the table `Deuda` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `id_vivienda` to the `Deuda` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Deuda" DROP CONSTRAINT "Deuda_id_usuario_fkey";

-- DropIndex
DROP INDEX "Deuda_cedula_usuario_key";

-- DropIndex
DROP INDEX "Deuda_id_usuario_key";

-- AlterTable
ALTER TABLE "Deuda" DROP COLUMN "cedula_usuario",
DROP COLUMN "id_usuario",
ADD COLUMN     "id_vivienda" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Deuda_id_vivienda_key" ON "Deuda"("id_vivienda");

-- AddForeignKey
ALTER TABLE "Deuda" ADD CONSTRAINT "Deuda_id_vivienda_fkey" FOREIGN KEY ("id_vivienda") REFERENCES "Vivienda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
