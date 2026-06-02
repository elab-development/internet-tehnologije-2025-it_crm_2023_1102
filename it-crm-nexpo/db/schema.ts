import {
  decimal,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "sales_manager",
  "it_consultant",
]);

export const userStatusEnum = pgEnum("user_status", ["active", "inactive"]);

export const clientStatusEnum = pgEnum("client_status", [
  "lead",
  "active",
  "inactive",
]);

export const projectRequestStatusEnum = pgEnum("project_request_status", [
  "new",
  "reviewing",
  "approved",
  "rejected",
  "completed",
]);

export const offerStatusEnum = pgEnum("offer_status", [
  "draft",
  "sent",
  "accepted",
  "rejected",
]);

export const interactionTypeEnum = pgEnum("interaction_type", [
  "email",
  "call",
  "meeting",
  "presentation",
]);

// Korisnici sistema sa različitim ulogama.
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 150 }).notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default("it_consultant"),
  status: userStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Klijenti koji šalju zahteve za IT projekte.
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 150 }).notNull(),
  company: varchar("company", { length: 120 }).notNull(),
  status: clientStatusEnum("status").notNull().default("lead"),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Zahtevi klijenata za IT projekte.
export const projectRequests = pgTable("project_requests", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 150 }).notNull(),
  description: text("description").notNull(),
  status: projectRequestStatusEnum("status").notNull().default("new"),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Ponude koje se kreiraju za projektne zahteve.
export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  status: offerStatusEnum("status").notNull().default("draft"),
  projectRequestId: integer("project_request_id")
    .notNull()
    .references(() => projectRequests.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Interakcije predstavljaju komunikaciju sa klijentima.
export const interactions = pgTable("interactions", {
  id: serial("id").primaryKey(),
  type: interactionTypeEnum("type").notNull(),
  summary: varchar("summary", { length: 255 }).notNull(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
  projectRequests: many(projectRequests),
  offers: many(offers),
  interactions: many(interactions),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.id],
  }),
  projectRequests: many(projectRequests),
  interactions: many(interactions),
}));

export const projectRequestsRelations = relations(
  projectRequests,
  ({ one, many }) => ({
    client: one(clients, {
      fields: [projectRequests.clientId],
      references: [clients.id],
    }),
    user: one(users, {
      fields: [projectRequests.userId],
      references: [users.id],
    }),
    offers: many(offers),
  })
);

export const offersRelations = relations(offers, ({ one }) => ({
  projectRequest: one(projectRequests, {
    fields: [offers.projectRequestId],
    references: [projectRequests.id],
  }),
  user: one(users, {
    fields: [offers.userId],
    references: [users.id],
  }),
}));

export const interactionsRelations = relations(interactions, ({ one }) => ({
  client: one(clients, {
    fields: [interactions.clientId],
    references: [clients.id],
  }),
  user: one(users, {
    fields: [interactions.userId],
    references: [users.id],
  }),
}));