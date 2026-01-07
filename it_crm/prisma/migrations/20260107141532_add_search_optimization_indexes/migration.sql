-- CreateIndex
CREATE INDEX "ClientCompany_categoryId_idx" ON "ClientCompany"("categoryId");

-- CreateIndex
CREATE INDEX "ClientCompany_salesManagerId_idx" ON "ClientCompany"("salesManagerId");

-- CreateIndex
CREATE INDEX "ClientCompany_freelanceConsultantId_idx" ON "ClientCompany"("freelanceConsultantId");

-- CreateIndex
CREATE INDEX "Contact_clientCompanyId_idx" ON "Contact"("clientCompanyId");

-- CreateIndex
CREATE INDEX "Contact_salesManagerId_idx" ON "Contact"("salesManagerId");

-- CreateIndex
CREATE INDEX "Contact_freelanceConsultantId_idx" ON "Contact"("freelanceConsultantId");

-- CreateIndex
CREATE INDEX "Opportunity_contactId_idx" ON "Opportunity"("contactId");

-- CreateIndex
CREATE INDEX "Opportunity_salesManagerId_idx" ON "Opportunity"("salesManagerId");

-- CreateIndex
CREATE INDEX "Opportunity_freelanceConsultantId_idx" ON "Opportunity"("freelanceConsultantId");

-- CreateIndex
CREATE INDEX "Opportunity_clientCompanyId_idx" ON "Opportunity"("clientCompanyId");

-- CreateIndex
CREATE INDEX "User_managerId_idx" ON "User"("managerId");
