import type { ClientCategory } from "@/src/client/types/clientCategory";

export type ClientCompany = {
  id: number;
  name: string;
  industry: string;
  companySize: string;
  website?: string | null;
  country: string;
  city: string;
  address: string;
  status: string;

  categoryId: number;
  category?: ClientCategory | null;

  salesManagerId: number;
  freelanceConsultantId: number;
};