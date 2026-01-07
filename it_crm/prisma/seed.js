// prisma/seed.js
//
// Preuslovi:
// npm i -D @faker-js/faker bcryptjs
//
// Pokretanje:
// npx prisma db seed
// ili (ako koristiš direktno):
// node prisma/seed.js

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { faker } = require("@faker-js/faker");

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

// Helper: hash password.
async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

// Helper: random CRM-ish vrednosti.
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function chance(min, max) {
  return Math.random() * (max - min) + min;
}

async function main() {
  faker.seed(20260107);

  // 1) Očisti bazu (redosled zbog FK).
  await prisma.opportunity.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.clientCompany.deleteMany();
  await prisma.clientCategory.deleteMany();
  await prisma.user.deleteMany();

  // 2) Kategorije (ClientCategory).
  const categories = await prisma.clientCategory.createMany({
    data: [
      { name: "Enterprise", description: "Velike kompanije sa kompleksnim prodajnim ciklusom." },
      { name: "SMB", description: "Mala i srednja preduzeća." },
      { name: "Startap", description: "Brzorastuće kompanije u ranoj fazi." },
      { name: "FinTech", description: "Kompanije iz oblasti finansijskih tehnologija." },
    ],
  });

  // Učitaj nazad kategorije (trebaju nam id-jevi).
  const categoryList = await prisma.clientCategory.findMany();

  // 3) Kreiraj admin i sales managere.
  // Napomena: managerId je obavezan (Int) u tvojoj šemi za sve User-e,
  // pa ćemo admin i sales_managere napraviti sa privremenim managerId,
  // pa ih posle update-ovati na self-reference.

  const adminPlain = "Admin123!";
  const smPlain = "Sales123!";

  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@crm.local",
      password: await hashPassword(adminPlain),
      role: "admin",
      isActive: true,
      managerId: 1, // privremeno; biće self nakon što dobijemo id (u praksi radi jer je tabela prazna i id=1).
    },
  });

  const salesManagersData = Array.from({ length: 2 }).map((_, i) => ({
    name: faker.person.fullName(),
    email: `sm${i + 1}@crm.local`,
    password: null, // setujemo posle zbog async hash-a
    role: "sales_manager",
    isActive: true,
    managerId: admin.id, // privremeno; kasnije self.
  }));

  // Hash za SM lozinke (isti plain, drugačiji hash).
  for (const sm of salesManagersData) {
    sm.password = await hashPassword(smPlain);
  }

  const createdSMs = [];
  for (const sm of salesManagersData) {
    createdSMs.push(await prisma.user.create({ data: sm }));
  }

  // Update admin i SM-ova na self-reference za managerId (da se zadovolji obavezni FK).
  await prisma.user.update({
    where: { id: admin.id },
    data: { managerId: admin.id },
  });

  for (const sm of createdSMs) {
    await prisma.user.update({
      where: { id: sm.id },
      data: { managerId: sm.id },
    });
  }

  // 4) Freelanceri (svaki ima tačno jednog SM manager-a).
  const freelancerPlain = "Free123!";

  const freelancers = [];
  for (let i = 0; i < 6; i++) {
    const manager = pick(createdSMs);
    const first = faker.person.firstName();
    const last = faker.person.lastName();

    freelancers.push(
      await prisma.user.create({
        data: {
          name: `${first} ${last}`,
          email: faker.internet.email({ firstName: first, lastName: last }).toLowerCase(),
          password: await hashPassword(freelancerPlain),
          role: "freelance_consultant",
          isActive: faker.datatype.boolean(0.9),
          managerId: manager.id,
        },
      })
    );
  }

  // 5) ClientCompany (svaki mora imati category + salesManager + freelancer).
  const industries = ["Technology", "Finance", "Retail", "Healthcare", "Logistics", "Marketing", "Education"];
  const sizes = ["1-10", "11-50", "51-200", "201-1000", "Enterprise"];
  const statuses = ["lead", "active", "inactive", "paused"];

  const companies = [];
  for (let i = 0; i < 12; i++) {
    const sm = pick(createdSMs);
    // U realnom scenariju, logično je da freelancer bude iz SM-ove grupe.
    // Pošto u bazi nema constraints za to, mi to ručno poštujemo:
    const smFreelancers = freelancers.filter((f) => f.managerId === sm.id);
    const fc = smFreelancers.length ? pick(smFreelancers) : pick(freelancers);

    const cat = pick(categoryList);
    const city = pick(["Belgrade", "Novi Sad", "Niš", "Kragujevac"]);
    const country = "Serbia";

    const companyName = faker.company.name();

    companies.push(
      await prisma.clientCompany.create({
        data: {
          name: companyName,
          industry: pick(industries),
          companySize: pick(sizes),
          website: faker.internet.url(),
          country,
          city,
          address: faker.location.streetAddress(),
          status: pick(statuses),
          categoryId: cat.id,
          salesManagerId: sm.id,
          freelanceConsultantId: fc.id,
        },
      })
    );
  }

  // 6) Contacts (svaki mora imati company + salesManager + freelancer).
  const positions = ["CEO", "CTO", "CFO", "Head of Procurement", "Product Manager", "Sales Director", "Operations Lead"];

  const contacts = [];
  for (const company of companies) {
    // 1-4 kontakta po kompaniji.
    const count = faker.number.int({ min: 1, max: 4 });

    // Uzimamo odgovorne iz kompanije (da veze budu konzistentne).
    const smId = company.salesManagerId;
    const fcId = company.freelanceConsultantId;

    for (let i = 0; i < count; i++) {
      const fullName = faker.person.fullName();
      contacts.push(
        await prisma.contact.create({
          data: {
            name: fullName,
            email: faker.internet.email().toLowerCase(),
            phone: faker.phone.number("+3816########"),
            position: pick(positions),
            notes: faker.datatype.boolean(0.5) ? faker.lorem.sentence() : null,
            clientCompanyId: company.id,
            salesManagerId: smId,
            freelanceConsultantId: fcId,
          },
        })
      );
    }
  }

  // 7) Opportunity (svaki mora imati contact + salesManager + freelancer; clientCompanyId je opcioni).
  const stages = ["prospecting", "discovery", "proposal", "negotiation", "won", "lost"];
  const oppStatuses = ["open", "open", "open", "closed"]; // više "open" u seed-u.
  const currencies = ["EUR", "USD"];

  const opportunities = [];
  for (const contact of contacts) {
    // 0-2 opportunity-ja po kontaktu.
    const count = faker.number.int({ min: 0, max: 2 });

    for (let i = 0; i < count; i++) {
      const estimatedValue = faker.number.int({ min: 500, max: 50000 });
      const probability = Number(chance(0.1, 0.9).toFixed(2));
      const expectedClose = faker.datatype.boolean(0.7)
        ? faker.date.soon({ days: 120 })
        : null;

      // Uzimamo SM i FC sa kontakta (konzistentno).
      const smId = contact.salesManagerId;
      const fcId = contact.freelanceConsultantId;

      // clientCompanyId: većinom setovan, ponekad null da pokažemo opcioni odnos.
      const includeCompany = faker.datatype.boolean(0.85);

      opportunities.push(
        await prisma.opportunity.create({
          data: {
            title: `${faker.company.buzzVerb()} ${faker.company.buzzNoun()} – ${faker.company.buzzAdjective()}`,
            description: faker.datatype.boolean(0.7) ? faker.lorem.sentences({ min: 1, max: 2 }) : null,
            stage: pick(stages),
            status: pick(oppStatuses),
            estimatedValue,
            currency: pick(currencies),
            probability,
            expectedCloseDate: expectedClose,
            contactId: contact.id,
            salesManagerId: smId,
            freelanceConsultantId: fcId,
            clientCompanyId: includeCompany ? contact.clientCompanyId : null,
          },
        })
      );
    }
  }

  // 8) Kratak “dokaz” da su veze tu: učitaj jednog SM-a sa svime.
  const exampleSM = createdSMs[0];

  const snapshot = await prisma.user.findUnique({
    where: { id: exampleSM.id },
    include: {
      freelancers: true,
      managedClientCompanies: {
        include: {
          category: true,
          contacts: true,
          opportunities: true,
        },
      },
      managedContacts: true,
      managedOpportunities: true,
    },
  });

  console.log("SEED ZAVRŠEN.");
  console.log("Kredencijali (plain) za test:");
  console.log({
    admin: { email: admin.email, password: adminPlain },
    sales_manager: { email: createdSMs[0].email, password: smPlain },
    freelancer_example: { email: freelancers[0].email, password: freelancerPlain },
  });

  console.log("\nBrojači:");
  const counts = await Promise.all([
    prisma.user.count(),
    prisma.clientCategory.count(),
    prisma.clientCompany.count(),
    prisma.contact.count(),
    prisma.opportunity.count(),
  ]);
  console.log({
    users: counts[0],
    clientCategories: counts[1],
    clientCompanies: counts[2],
    contacts: counts[3],
    opportunities: counts[4],
  });
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
