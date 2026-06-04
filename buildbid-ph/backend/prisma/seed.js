require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  console.log("🌱 Seeding BuildBid PH database...");

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.project.deleteMany();
  await prisma.verificationDocument.deleteMany();
  await prisma.contractorProfile.deleteMany();
  await prisma.clientProfile.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash("admin123", 12);
  const clientPw = await bcrypt.hash("client123", 12);
  const contractorPw = await bcrypt.hash("contractor123", 12);

  // Create admin
  const adminUser = await prisma.user.create({
    data: {
      name: "Admin BuildBid",
      email: "admin@buildbid.ph",
      password,
      role: "ADMIN",
      emailVerified: true,
      userStatus: "VERIFIED",
      admin: { create: {} },
    },
  });
  console.log("✅ Admin created:", adminUser.email);

  // Create clients
  const clients = await Promise.all([
    prisma.user.create({
      data: {
        name: "Maria Santos",
        email: "client@buildbid.ph",
        password: clientPw,
        role: "CLIENT",
        phone: "+63 912 345 6789",
        emailVerified: true,
        userStatus: "VERIFIED",
        client: { create: { city: "Cebu City" } },
      },
    }),
    prisma.user.create({
      data: {
        name: "Roberto Reyes",
        email: "roberto@reyes.ph",
        password: clientPw,
        role: "CLIENT",
        phone: "+63 917 111 2222",
        emailVerified: true,
        userStatus: "VERIFIED",
        client: { create: { city: "Quezon City" } },
      },
    }),
    prisma.user.create({
      data: {
        name: "Anna Dela Cruz",
        email: "anna@example.com",
        password: clientPw,
        role: "CLIENT",
        emailVerified: true,
        userStatus: "VERIFIED",
        client: { create: { city: "Davao City" } },
      },
    }),
  ]);
  console.log(`✅ ${clients.length} clients created`);

  // Create contractors
  const contractorUsers = await Promise.all([
    prisma.user.create({
      data: {
        name: "Jose Construction Corp",
        email: "contractor@buildbid.ph",
        password: contractorPw,
        role: "CONTRACTOR",
        phone: "+63 919 888 7777",
        emailVerified: true,
        userStatus: "VERIFIED",
        contractor: {
          create: {
            companyName: "Jose Construction Corp",
            licenseNumber: "PCAB-2024-001",
            yearsExperience: 15,
            verificationStatus: "VERIFIED",
            verifiedAt: new Date(),
            verifiedBy: adminUser.id,
            rating: 4.8,
            completedProjects: 42,
            bio: "Trusted construction company specializing in commercial and residential projects.",
            city: "Cebu City",
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Marvin Cruz Builders",
        email: "marvin@cruzbuild.ph",
        password: contractorPw,
        role: "CONTRACTOR",
        emailVerified: true,
        userStatus: "VERIFIED",
        contractor: {
          create: {
            companyName: "Cruz Builders Inc.",
            yearsExperience: 8,
            verificationStatus: "VERIFIED",
            verifiedAt: new Date(),
            verifiedBy: adminUser.id,
            rating: 4.5,
            completedProjects: 18,
            city: "Manila",
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Rico Construction",
        email: "rico@construction.ph",
        password: contractorPw,
        role: "CONTRACTOR",
        emailVerified: true,
        userStatus: "VERIFIED",
        contractor: {
          create: {
            verificationStatus: "PENDING",
            city: "Davao City",
          },
        },
      },
    }),
  ]);
  console.log(`✅ ${contractorUsers.length} contractors created`);

  // Get client profiles
  const client1 = await prisma.clientProfile.findUnique({ where: { userId: clients[0].id } });
  const client2 = await prisma.clientProfile.findUnique({ where: { userId: clients[1].id } });
  const client3 = await prisma.clientProfile.findUnique({ where: { userId: clients[2].id } });

  // Create projects
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        clientId: client1.id,
        title: "SM Mall Cebu Renovation",
        description: "Full interior renovation of 3 floors including electrical, plumbing, and HVAC works.",
        category: "Commercial",
        budget: 2400000,
        deadline: new Date("2024-07-15"),
        location: "Cebu City, Cebu",
        city: "Cebu City",
        status: "BIDDING",
      },
    }),
    prisma.project.create({
      data: {
        clientId: client2.id,
        title: "BF Homes Residential Build",
        description: "3-bedroom single-family house construction on 200sqm lot with modern design.",
        category: "Residential",
        budget: 850000,
        deadline: new Date("2024-08-22"),
        location: "BF Homes, Paranaque",
        city: "Paranaque",
        status: "IN_PROGRESS",
      },
    }),
    prisma.project.create({
      data: {
        clientId: client3.id,
        title: "Davao Cold Storage Facility",
        description: "2000sqm cold storage warehouse with refrigeration systems and loading bays.",
        category: "Industrial",
        budget: 5500000,
        deadline: new Date("2024-11-01"),
        location: "Buhangin, Davao City",
        city: "Davao City",
        status: "OPEN",
      },
    }),
    prisma.project.create({
      data: {
        clientId: client1.id,
        title: "Lahug Office Renovation",
        description: "Complete renovation of 300sqm office space including glass partitions and workstations.",
        category: "Commercial",
        budget: 750000,
        deadline: new Date("2024-09-30"),
        location: "Lahug, Cebu City",
        city: "Cebu City",
        status: "OPEN",
      },
    }),
  ]);
  console.log(`✅ ${projects.length} projects created`);

  // Get contractors
  const contractor1 = await prisma.contractorProfile.findUnique({ where: { userId: contractorUsers[0].id } });
  const contractor2 = await prisma.contractorProfile.findUnique({ where: { userId: contractorUsers[1].id } });

  // Create bids
  await Promise.all([
    prisma.bid.create({
      data: {
        projectId: projects[0].id,
        contractorId: contractor1.id,
        amount: 2250000,
        proposal: "We propose a complete renovation using premium materials. Our team has 15+ years experience in commercial projects.",
        laborCost: 900000,
        materialCost: 1350000,
        estimatedDays: 90,
        completionDate: new Date("2024-07-10"),
        status: "PENDING",
      },
    }),
    prisma.bid.create({
      data: {
        projectId: projects[0].id,
        contractorId: contractor2.id,
        amount: 2100000,
        proposal: "Competitive pricing with quality workmanship. Includes 1-year warranty on all installations.",
        laborCost: 840000,
        materialCost: 1260000,
        estimatedDays: 95,
        status: "PENDING",
      },
    }),
  ]);
  console.log("✅ Bids created");

  // Welcome notifications
  for (const user of [...clients, ...contractorUsers]) {
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "SYSTEM",
        title: "Welcome to BuildBid PH! 🎉",
        message: "Your account is ready. Start exploring projects and connecting with contractors.",
        link: "/dashboard",
      },
    });
  }
  console.log("✅ Notifications created");

  console.log("\n🎉 Seed complete!");
  console.log("─────────────────────────────");
  console.log("📧 Demo logins:");
  console.log("  Admin:      admin@buildbid.ph / admin123");
  console.log("  Client:     client@buildbid.ph / client123");
  console.log("  Contractor: contractor@buildbid.ph / contractor123");
  console.log("─────────────────────────────");
}

main()
  .catch((e) => { console.error("Seed error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
