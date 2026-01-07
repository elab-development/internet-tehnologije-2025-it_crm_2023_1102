-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "password" TEXT,
    "role" TEXT,
    "isActive" BOOLEAN,
    "managerId" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientCategory" (
    "id" INTEGER NOT NULL,
    "name" TEXT,
    "description" TEXT,

    CONSTRAINT "ClientCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientCompany" (
    "id" INTEGER NOT NULL,
    "name" TEXT,
    "industry" TEXT,
    "companySize" TEXT,
    "website" TEXT,
    "country" TEXT,
    "city" TEXT,
    "address" TEXT,
    "status" TEXT,
    "categoryId" INTEGER,
    "salesManagerId" INTEGER,
    "freelanceConsultantId" INTEGER,

    CONSTRAINT "ClientCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" INTEGER NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "position" TEXT,
    "notes" TEXT,
    "clientCompanyId" INTEGER,
    "salesManagerId" INTEGER,
    "freelanceConsultantId" INTEGER,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" INTEGER NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "stage" TEXT,
    "status" TEXT,
    "estimatedValue" DOUBLE PRECISION,
    "currency" TEXT,
    "probability" DOUBLE PRECISION,
    "expectedCloseDate" TIMESTAMP(3),
    "contactId" INTEGER,
    "salesManagerId" INTEGER,
    "freelanceConsultantId" INTEGER,
    "clientCompanyId" INTEGER,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);
