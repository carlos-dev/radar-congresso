import "dotenv/config";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Prisma 7: the datasource connection URL lives here (used by the Prisma CLI
// for migrate/introspection). .env is no longer auto-loaded when a
// prisma.config.ts is present, so we load it explicitly above.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: env("DATABASE_URL"),
  },
});
