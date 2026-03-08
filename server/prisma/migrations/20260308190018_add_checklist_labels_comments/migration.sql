-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "content" TEXT,
ALTER COLUMN "payload" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "checklistItems" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Label" ADD COLUMN     "boardId" TEXT;
