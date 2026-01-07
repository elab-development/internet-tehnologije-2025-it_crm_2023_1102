/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `ClientCategory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Made the column `name` on table `ClientCategory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `ClientCompany` required. This step will fail if there are existing NULL values in that column.
  - Made the column `industry` on table `ClientCompany` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companySize` on table `ClientCompany` required. This step will fail if there are existing NULL values in that column.
  - Made the column `country` on table `ClientCompany` required. This step will fail if there are existing NULL values in that column.
  - Made the column `city` on table `ClientCompany` required. This step will fail if there are existing NULL values in that column.
  - Made the column `address` on table `ClientCompany` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `ClientCompany` required. This step will fail if there are existing NULL values in that column.
  - Made the column `categoryId` on table `ClientCompany` required. This step will fail if there are existing NULL values in that column.
  - Made the column `salesManagerId` on table `ClientCompany` required. This step will fail if there are existing NULL values in that column.
  - Made the column `freelanceConsultantId` on table `ClientCompany` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `Contact` required. This step will fail if there are existing NULL values in that column.
  - Made the column `clientCompanyId` on table `Contact` required. This step will fail if there are existing NULL values in that column.
  - Made the column `salesManagerId` on table `Contact` required. This step will fail if there are existing NULL values in that column.
  - Made the column `freelanceConsultantId` on table `Contact` required. This step will fail if there are existing NULL values in that column.
  - Made the column `title` on table `Opportunity` required. This step will fail if there are existing NULL values in that column.
  - Made the column `stage` on table `Opportunity` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `Opportunity` required. This step will fail if there are existing NULL values in that column.
  - Made the column `estimatedValue` on table `Opportunity` required. This step will fail if there are existing NULL values in that column.
  - Made the column `currency` on table `Opportunity` required. This step will fail if there are existing NULL values in that column.
  - Made the column `probability` on table `Opportunity` required. This step will fail if there are existing NULL values in that column.
  - Made the column `contactId` on table `Opportunity` required. This step will fail if there are existing NULL values in that column.
  - Made the column `salesManagerId` on table `Opportunity` required. This step will fail if there are existing NULL values in that column.
  - Made the column `freelanceConsultantId` on table `Opportunity` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `password` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `role` to the `User` table without a default value. This is not possible if the table is not empty.
  - Made the column `isActive` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `managerId` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'sales_manager', 'freelance_consultant');

-- DropForeignKey
ALTER TABLE "ClientCompany" DROP CONSTRAINT "ClientCompany_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "ClientCompany" DROP CONSTRAINT "ClientCompany_freelanceConsultantId_fkey";

-- DropForeignKey
ALTER TABLE "ClientCompany" DROP CONSTRAINT "ClientCompany_salesManagerId_fkey";

-- DropForeignKey
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_clientCompanyId_fkey";

-- DropForeignKey
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_freelanceConsultantId_fkey";

-- DropForeignKey
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_salesManagerId_fkey";

-- DropForeignKey
ALTER TABLE "Opportunity" DROP CONSTRAINT "Opportunity_contactId_fkey";

-- DropForeignKey
ALTER TABLE "Opportunity" DROP CONSTRAINT "Opportunity_freelanceConsultantId_fkey";

-- DropForeignKey
ALTER TABLE "Opportunity" DROP CONSTRAINT "Opportunity_salesManagerId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_managerId_fkey";

-- AlterTable
ALTER TABLE "ClientCategory" ALTER COLUMN "name" SET NOT NULL;

-- AlterTable
ALTER TABLE "ClientCompany" ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "industry" SET NOT NULL,
ALTER COLUMN "companySize" SET NOT NULL,
ALTER COLUMN "country" SET NOT NULL,
ALTER COLUMN "city" SET NOT NULL,
ALTER COLUMN "address" SET NOT NULL,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "categoryId" SET NOT NULL,
ALTER COLUMN "salesManagerId" SET NOT NULL,
ALTER COLUMN "freelanceConsultantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Contact" ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "clientCompanyId" SET NOT NULL,
ALTER COLUMN "salesManagerId" SET NOT NULL,
ALTER COLUMN "freelanceConsultantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Opportunity" ALTER COLUMN "title" SET NOT NULL,
ALTER COLUMN "stage" SET NOT NULL,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "estimatedValue" SET NOT NULL,
ALTER COLUMN "currency" SET NOT NULL,
ALTER COLUMN "probability" SET NOT NULL,
ALTER COLUMN "contactId" SET NOT NULL,
ALTER COLUMN "salesManagerId" SET NOT NULL,
ALTER COLUMN "freelanceConsultantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "password" SET NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL,
ALTER COLUMN "isActive" SET NOT NULL,
ALTER COLUMN "managerId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ClientCategory_name_key" ON "ClientCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCompany" ADD CONSTRAINT "ClientCompany_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ClientCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCompany" ADD CONSTRAINT "ClientCompany_salesManagerId_fkey" FOREIGN KEY ("salesManagerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCompany" ADD CONSTRAINT "ClientCompany_freelanceConsultantId_fkey" FOREIGN KEY ("freelanceConsultantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "ClientCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_salesManagerId_fkey" FOREIGN KEY ("salesManagerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_freelanceConsultantId_fkey" FOREIGN KEY ("freelanceConsultantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_salesManagerId_fkey" FOREIGN KEY ("salesManagerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_freelanceConsultantId_fkey" FOREIGN KEY ("freelanceConsultantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
