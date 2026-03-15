/*
  Warnings:

  - Added the required column `userId` to the `Exam` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `ExamSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ExamSession" ADD COLUMN     "userId" TEXT NOT NULL;
