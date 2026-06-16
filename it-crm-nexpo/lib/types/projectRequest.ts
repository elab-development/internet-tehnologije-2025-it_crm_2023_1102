export type ProjectRequestStatus =
  | "new"
  | "reviewing"
  | "approved"
  | "rejected"
  | "completed";

// Tip za projektni zahtev koji se koristi na frontend strani.
export type ProjectRequestType = {
  id: number;
  title: string;
  description: string;
  status: ProjectRequestStatus;
  clientId: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
};