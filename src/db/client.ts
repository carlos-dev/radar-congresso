import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Prisma 7 uses the query compiler and requires a driver adapter for the
// database connection instead of the datasource `url` in schema.prisma.
// Creating the adapter/client inside the factory ensures the pg Pool is only
// created when a new client is actually needed (avoids Pool leaks on HMR).
function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
