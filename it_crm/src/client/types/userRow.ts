import type { Role } from "./role";

export type UserRow = {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  managerId?: number | null;
};