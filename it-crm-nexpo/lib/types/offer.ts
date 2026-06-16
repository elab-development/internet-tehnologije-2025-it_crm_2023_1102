export type OfferStatus = "draft" | "sent" | "accepted" | "rejected";

// Tip za ponudu koji se koristi na frontend strani.
export type OfferType = {
  id: number;
  price: string;
  status: OfferStatus;
  projectRequestId: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
};