export type InteractionTypeName =
  | "email"
  | "call"
  | "meeting"
  | "presentation";

// Tip za interakciju koji se koristi na frontend strani.
export type InteractionType = {
  id: number;
  type: InteractionTypeName;
  summary: string;
  clientId: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
};