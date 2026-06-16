export type UserRole = "admin" | "sales_manager" | "it_consultant";

export type UserStatus = "active" | "inactive";

// Tip za korisnika koji se koristi na frontend strani.
export type UserType = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
};