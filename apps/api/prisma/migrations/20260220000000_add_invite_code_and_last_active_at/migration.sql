-- AlterTable
ALTER TABLE "User" ADD COLUMN "inviteCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Populate existing rows with a placeholder (empty table in dev, but just in case)
UPDATE "User" SET "inviteCode" = gen_random_uuid()::text WHERE "inviteCode" = '';

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteCode_key" ON "User"("inviteCode");

-- Remove the default now that we've backfilled
ALTER TABLE "User" ALTER COLUMN "inviteCode" DROP DEFAULT;
