import type { Role } from "./role";

export type Me = { id: number; name: string; email: string; role: Role; isActive: boolean; managerId?: number };