import { fileURLToPath } from "node:url";

import { createDatabasePool, runMigrations } from "../src/index";
import { requireEnv } from "../src/env";

const migrationsDirectory = fileURLToPath(new URL("../migrations/", import.meta.url));

const pool = createDatabasePool(requireEnv("DATABASE_URL"));

try {
  const applied = await runMigrations(pool, migrationsDirectory);

  if (applied.length === 0) {
    console.log("Database is already up to date.");
  } else {
    for (const migration of applied) {
      console.log(`Applied ${migration}`);
    }
  }
} finally {
  await pool.end();
}
