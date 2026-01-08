export type Opportunity = {
  id: number;
  title: string;
  description?: string | null;
  stage: string;
  status: string;
  estimatedValue: number;
  currency: string;
  probability: number;
  expectedCloseDate?: string | null;

  contactId: number;
  clientCompanyId?: number | null;

  salesManagerId: number;
  freelanceConsultantId: number;

  contact?: { id: number; name: string } | null;
  clientCompany?: { id: number; name: string } | null;
};