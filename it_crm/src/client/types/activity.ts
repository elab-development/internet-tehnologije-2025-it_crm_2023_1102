export type ActivityType = "note" | "call" | "meeting";
export type ActivityEntityType = "clientCompany" | "opportunity";

export type Activity = {
  id: string;
  userId: number;
  entityType: ActivityEntityType;
  entityId: number;
  type: ActivityType;
  description: string;
  createdAt: string;
};
