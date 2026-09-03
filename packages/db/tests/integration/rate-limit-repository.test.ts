import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createDatabasePool,
  PostgresRateLimitRepository,
  runMigrations,
  type RateLimitRule,
} from "../../src/index";
import { requireEnv } from "../../src/env";

const migrationsDirectory = fileURLToPath(new URL("../../migrations/", import.meta.url));

const pool = createDatabasePool(requireEnv("TEST_DATABASE_URL"));

const repository = new PostgresRateLimitRepository(pool);

function rule(scope: string, keyHash: string, limit: number): RateLimitRule {
  return {
    scope,
    keyHash,
    limit,
    windowStart: new Date("2026-08-27T18:00:00.000Z"),
  };
}

beforeAll(async () => {
  await runMigrations(pool, migrationsDirectory);
});

beforeEach(async () => {
  await pool.query("TRUNCATE TABLE demo_rate_limits");
});

afterAll(async () => {
  await pool.end();
});

describe("PostgresRateLimitRepository", () => {
  it("atomically enforces a fixed-window limit", async () => {
    const clientRule = rule("ai-client", "a".repeat(64), 2);

    expect(await repository.consumeAll([clientRule])).toEqual({
      allowed: true,
      blockedScope: null,
    });

    expect(await repository.consumeAll([clientRule])).toEqual({
      allowed: true,
      blockedScope: null,
    });

    expect(await repository.consumeAll([clientRule])).toEqual({
      allowed: false,
      blockedScope: "ai-client",
    });
  });

  it("rolls back earlier counters when a later rule blocks", async () => {
    const clientRule = rule("ai-client", "b".repeat(64), 2);

    const globalRule = rule("ai-global", "c".repeat(64), 1);

    expect((await repository.consumeAll([clientRule, globalRule])).allowed).toBe(true);

    expect(await repository.consumeAll([clientRule, globalRule])).toEqual({
      allowed: false,
      blockedScope: "ai-global",
    });

    expect((await repository.consumeAll([clientRule])).allowed).toBe(true);

    expect((await repository.consumeAll([clientRule])).allowed).toBe(false);
  });
});
