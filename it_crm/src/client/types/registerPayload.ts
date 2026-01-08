import type { Role } from "./role";

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  role: Role;
  managerId?: string;
};