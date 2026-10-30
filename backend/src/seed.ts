// Seed file — tạo dữ liệu mẫu cho demo
// Run: npm run db:seed

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Xóa dữ liệu cũ nếu có
  await prisma.alert.deleteMany();
  await prisma.sensorReading.deleteMany();
  await prisma.device.deleteMany();

  // Tạo 3 động cơ mẫu
  const devices = await prisma.device.createMany({
    data: [
      {
        id: "MOTOR_INDUCTION_01",
        name: "Induction Motor — Line A, Unit 01",
        type: "induction_motor",
        location: "Factory Floor A, Zone 1",
        ratedPower: 7.5,
        ratedRpm: 1450,
        status: "ACTIVE",
      },
      {
        id: "MOTOR_INDUCTION_02",
        name: "Induction Motor — Line B, Unit 02",
        type: "induction_motor",
        location: "Factory Floor B, Zone 3",
        ratedPower: 15.0,
        ratedRpm: 1480,
        status: "ACTIVE",
      },
      {
        id: "PUMP_MOTOR_01",
        name: "Centrifugal Pump Motor — Cooling System",
        type: "pump_motor",
        location: "Utility Room, Cooling Circuit",
        ratedPower: 5.5,
        ratedRpm: 2900,
        status: "ACTIVE",
      },
    ],
  });

  console.log(`✅ Created ${devices.count} devices`);
  console.log("🎉 Seeding complete!\n");
  console.log("Device IDs available for Simulator:");
  console.log("  → MOTOR_INDUCTION_01");
  console.log("  → MOTOR_INDUCTION_02");
  console.log("  → PUMP_MOTOR_01");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
