/*
  Warnings:

  - You are about to drop the `conversations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."conversations" DROP CONSTRAINT "conversations_assignedTo_fkey";

-- DropForeignKey
ALTER TABLE "public"."conversations" DROP CONSTRAINT "conversations_contactId_fkey";

-- DropTable
DROP TABLE "public"."conversations";

-- DropEnum
DROP TYPE "public"."ConversationStatus";

-- DropEnum
DROP TYPE "public"."Priority";
