-- AlterTable
ALTER TABLE "Observation" ADD COLUMN "sourceId" TEXT;
ALTER TABLE "Observation" ADD COLUMN "sourceUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Observation_sourceId_key" ON "Observation"("sourceId");

