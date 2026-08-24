import "server-only";

import { createDatabasePool } from "@proposal-agent/db";

type DatabasePool = ReturnType<typeof createDatabasePool>;

const globalForDatabase = globalThis as typeof globalThis & {
  proposalAgentDatabasePool?: DatabasePool;
};

function requireDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "Missing DATABASE_URL. Configure it in apps/web/.env.local.",
    );
  }

  return databaseUrl;
}

export function getDatabasePool(): DatabasePool {
  if (globalForDatabase.proposalAgentDatabasePool) {
    return globalForDatabase.proposalAgentDatabasePool;
  }

  const pool = createDatabasePool(requireDatabaseUrl());

  if (process.env.NODE_ENV !== "production") {
    globalForDatabase.proposalAgentDatabasePool = pool;
  }

  return pool;
}
