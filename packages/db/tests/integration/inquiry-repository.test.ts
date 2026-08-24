import { fileURLToPath } from "node:url";

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  createDatabasePool,
  PostgresInquiryRepository,
  runMigrations,
} from "../../src/index";
import { requireEnv } from "../../src/env";

const migrationsDirectory = fileURLToPath(
  new URL("../../migrations/", import.meta.url),
);

const pool = createDatabasePool(requireEnv("TEST_DATABASE_URL"));
const repository = new PostgresInquiryRepository(pool);

beforeAll(async () => {
  await runMigrations(pool, migrationsDirectory);
});

beforeEach(async () => {
  await pool.query("TRUNCATE TABLE inquiries");
});

afterAll(async () => {
  await pool.end();
});

describe("PostgresInquiryRepository", () => {
  it("persists and loads an inquiry", async () => {
    const inquiry = {
      id: "3ac7f2de-7430-47d6-b63f-9c899eafd248",
      rawText: "We need 45 rooms for our company offsite.",
      createdAt: new Date("2026-08-22T10:00:00.000Z"),
    };

    await repository.create(inquiry);

    const persisted = await repository.findById(inquiry.id);

    expect(persisted).not.toBeNull();
    expect(persisted?.id).toBe(inquiry.id);
    expect(persisted?.rawText).toBe(inquiry.rawText);
    expect(persisted?.createdAt.toISOString()).toBe(
      inquiry.createdAt.toISOString(),
    );
  });

  it("returns null for an unknown inquiry", async () => {
    const result = await repository.findById(
      "87be958b-8903-4bbd-a48b-0c19d57af064",
    );

    expect(result).toBeNull();
  });
});
