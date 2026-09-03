import { fileURLToPath } from "node:url";

import {
  calculatePricing,
  createProposalDraft,
  type CatalogSelection,
  type ResolvedInquiry,
} from "@proposal-agent/domain";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createDatabasePool,
  PostgresInquiryRepository,
  PostgresProposalDraftRepository,
  runMigrations,
} from "../../src/index";
import { requireEnv } from "../../src/env";

const migrationsDirectory = fileURLToPath(new URL("../../migrations/", import.meta.url));

const pool = createDatabasePool(requireEnv("TEST_DATABASE_URL"));

const inquiryRepository = new PostgresInquiryRepository(pool);

const proposalDraftRepository = new PostgresProposalDraftRepository(pool);

const inquiryId = "3ac7f2de-7430-47d6-b63f-9c899eafd248";

const draftId = "77a37479-886a-4a0a-a933-6e065cc5787c";

const resolvedInquiry: ResolvedInquiry = {
  guests: 20,
  rooms: 10,
  startDate: "2026-10-14",
  endDate: "2026-10-16",
  budgetCents: 5_000_000,
  requirements: ["company offsite", "late checkout"],
};

const selections: readonly CatalogSelection[] = [
  {
    catalogItemId: "hotel_room_night",
    occurrences: 1,
  },
];

function calculateHotelPricing(unitPriceMinor: number) {
  return calculatePricing({
    inquiry: resolvedInquiry,
    catalogVersion: "2026-08-demo-v1",
    catalog: [
      {
        id: "hotel_room_night",
        name: "Hotel room",
        currency: "SEK",
        unitPriceMinor,
        pricingBasis: "per_room_night",
        active: true,
      },
    ],
    selections,
  });
}

beforeAll(async () => {
  await runMigrations(pool, migrationsDirectory);
});

beforeEach(async () => {
  await pool.query("TRUNCATE TABLE inquiries CASCADE");
});

afterAll(async () => {
  await pool.end();
});

describe("PostgresProposalDraftRepository", () => {
  it("persists and loads the complete proposal draft snapshot", async () => {
    await inquiryRepository.create({
      id: inquiryId,
      rawText: "20 people, 10 rooms, 2026-10-14 to 2026-10-16.",
      createdAt: new Date("2026-08-27T12:00:00.000Z"),
    });

    const draft = createProposalDraft({
      id: draftId,
      inquiryId,
      resolvedInquiry,
      selections,
      pricing: calculateHotelPricing(150_000),
      createdAt: new Date("2026-08-27T13:00:00.000Z"),
    });

    await proposalDraftRepository.create(draft);

    const persisted = await proposalDraftRepository.findById(draftId);

    expect(persisted).toEqual(draft);

    expect(persisted?.pricing.totalMinor).toBe(3_000_000);

    expect(persisted?.pricing.lines[0]?.unitPriceMinor).toBe(150_000);
  });

  it("keeps historical pricing independent of later catalog changes", async () => {
    await inquiryRepository.create({
      id: inquiryId,
      rawText: "Historical proposal snapshot test.",
      createdAt: new Date("2026-08-27T12:00:00.000Z"),
    });

    const originalDraft = createProposalDraft({
      id: draftId,
      inquiryId,
      resolvedInquiry,
      selections,
      pricing: calculateHotelPricing(150_000),
      createdAt: new Date("2026-08-27T13:00:00.000Z"),
    });

    await proposalDraftRepository.create(originalDraft);

    const currentPricing = calculateHotelPricing(200_000);

    expect(currentPricing.totalMinor).toBe(4_000_000);

    const persisted = await proposalDraftRepository.findById(draftId);

    expect(persisted?.pricing.totalMinor).toBe(3_000_000);

    expect(persisted?.pricing.lines[0]?.unitPriceMinor).toBe(150_000);
  });

  it("returns null for an unknown proposal draft", async () => {
    const result = await proposalDraftRepository.findById("87be958b-8903-4bbd-a48b-0c19d57af064");

    expect(result).toBeNull();
  });
});
