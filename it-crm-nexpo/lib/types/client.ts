export type ClientStatus = "lead" | "active" | "inactive";

// Tip za klijenta koji se koristi na frontend strani.
export type ClientType = {
  id: number;
  name: string;
  email: string;
  company: string;
  status: ClientStatus;
  userId: number;
  createdAt: string;
  updatedAt: string;
};