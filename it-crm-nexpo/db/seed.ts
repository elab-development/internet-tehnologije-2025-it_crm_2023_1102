import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  clients,
  interactions,
  offers,
  projectRequests,
  users,
} from "./schema";

async function main() {
  // Brišemo stare podatke redosledom koji poštuje relacije između tabela.
  await db.delete(interactions);
  await db.delete(offers);
  await db.delete(projectRequests);
  await db.delete(clients);
  await db.delete(users);

  const hashedPassword = await bcrypt.hash("password", 10);

  // Kreiramo korisnike za sve tri uloge u aplikaciji.
  const [admin] = await db
    .insert(users)
    .values({
      name: "Jelena Popadić",
      email: "jelena.popadic@nexpo.com",
      password: hashedPassword,
      role: "admin",
      status: "active",
    })
    .returning();

  const [salesManager] = await db
    .insert(users)
    .values({
      name: "Jelena Filipović",
      email: "jelena.filipovic@nexpo.com",
      password: hashedPassword,
      role: "sales_manager",
      status: "active",
    })
    .returning();

  const [itConsultant] = await db
    .insert(users)
    .values({
      name: "NEXPO Consultant",
      email: "consultant@nexpo.com",
      password: hashedPassword,
      role: "it_consultant",
      status: "active",
    })
    .returning();

  // Kreiramo klijente i povezujemo ih sa korisnicima.
  const [clientOne] = await db
    .insert(clients)
    .values({
      name: "Marko Petrović",
      email: "marko@techvision.com",
      company: "TechVision",
      status: "lead",
      userId: salesManager.id,
    })
    .returning();

  const [clientTwo] = await db
    .insert(clients)
    .values({
      name: "Ana Jovanović",
      email: "ana@smartapps.com",
      company: "SmartApps",
      status: "active",
      userId: itConsultant.id,
    })
    .returning();

  const [clientThree] = await db
    .insert(clients)
    .values({
      name: "Nikola Savić",
      email: "nikola@cloudnova.com",
      company: "CloudNova",
      status: "inactive",
      userId: admin.id,
    })
    .returning();

  // Kreiramo projektne zahteve za svakog klijenta.
  const [requestOne] = await db
    .insert(projectRequests)
    .values({
      title: "CRM Web Application",
      description:
        "Client needs a simple CRM system for managing IT customers and offers.",
      status: "reviewing",
      clientId: clientOne.id,
      userId: salesManager.id,
    })
    .returning();

  const [requestTwo] = await db
    .insert(projectRequests)
    .values({
      title: "Mobile App Development",
      description:
        "Client wants a mobile app for booking IT support appointments.",
      status: "approved",
      clientId: clientTwo.id,
      userId: itConsultant.id,
    })
    .returning();

  const [requestThree] = await db
    .insert(projectRequests)
    .values({
      title: "Cloud Migration",
      description: "Client is interested in moving internal tools to the cloud.",
      status: "new",
      clientId: clientThree.id,
      userId: admin.id,
    })
    .returning();

  // Kreiramo ponude povezane sa projektnim zahtevima.
  await db.insert(offers).values({
    price: "2500.00",
    status: "sent",
    projectRequestId: requestOne.id,
    userId: salesManager.id,
  });

  await db.insert(offers).values({
    price: "4800.00",
    status: "accepted",
    projectRequestId: requestTwo.id,
    userId: itConsultant.id,
  });

  await db.insert(offers).values({
    price: "3200.00",
    status: "draft",
    projectRequestId: requestThree.id,
    userId: admin.id,
  });

  // Kreiramo interakcije koje prikazuju komunikaciju sa klijentima.
  await db.insert(interactions).values({
    type: "email",
    summary: "Initial email about CRM application requirements.",
    clientId: clientOne.id,
    userId: salesManager.id,
  });

  await db.insert(interactions).values({
    type: "meeting",
    summary: "Online meeting about mobile app features and deadline.",
    clientId: clientTwo.id,
    userId: itConsultant.id,
  });

  await db.insert(interactions).values({
    type: "call",
    summary: "Short call about cloud migration pricing.",
    clientId: clientThree.id,
    userId: admin.id,
  });

  // Proveravamo da li su korisnici uspešno ubačeni.
  const adminUser = await db
    .select()
    .from(users)
    .where(eq(users.email, "jelena.popadic@nexpo.com"));

  console.log("Seed data created successfully.");
  console.log("Admin user:", adminUser[0]?.email);
  console.log("Password for all users: password");
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});