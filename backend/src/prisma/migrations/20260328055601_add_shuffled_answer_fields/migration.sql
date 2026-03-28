-- AlterTable
ALTER TABLE "Answer" ADD COLUMN     "shuffledCorrectIndex" INTEGER,
ADD COLUMN     "shuffledOptions" JSONB;
