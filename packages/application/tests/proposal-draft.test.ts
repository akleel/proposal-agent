import type {
  InquiryExtraction,
  InquiryReviewDecision,
  ProposalDraft,
} from "@proposal-agent/domain";
import { describe, expect, it } from "vitest";

import {
  createProposalDraft,
  getProposalDraft,
  type CatalogProvider,
  type InquiryReviewRepository,
  type ProposalDraftRepository,
} from "../src/index";

const inquiryId = "3ac7f2de-7430-47d6-b63f-9c899eafd248";

const draftId = "77a37479-886a-4a0a-a933-6e065cc5787c";

const readyExtraction: InquiryExtraction = {
  guests: {
    value: 20,
    confidence: 0.99,
    source: "20 people",
    requiresReview: false,
  },
  rooms: {
    value: 10,
    confidence: 0.99,
    source: "10 hotel rooms",
    requiresReview: false,
  },
  startDate: {
    value: "2026-10-14",
    confidence: 0.99,
    source: "2026-10-14",
    requiresReview: false,
  },
  endDate: {
    value: "2026-10-16",
    confidence: 0.99,
    source: "2026-10-16",
    requiresReview: false,
  },
  budgetCents: {
    value: 5_000_000,
    confidence: 0.99,
    source: "SEK 50,000",
    requiresReview: false,
  },
  requirements: [
    {
      value: "company offsite",
      confidence: 0.99,
      source: "company offsite",
      requiresReview: false,
    },
  ],
};

const reviewRequiredExtraction: InquiryExtraction = {
  ...readyExtraction,
  endDate: {
    value: null,
    confidence: 0,
    source: null,
    requiresReview: true,
  },
};

function createReviewRepository(
  extraction: InquiryExtraction | null,
  decisions: readonly InquiryReviewDecision[] = [],
): InquiryReviewRepository {
  return {
    async replaceExtraction() {
      throw new Error("Not used by this test.");
    },

    async findByInquiryId() {
      if (!extraction) {
        return null;
      }

      return {
        inquiryId,
        extraction,
        extractedAt: new Date("2026-08-27T12:00:00.000Z"),
        decisions,
      };
    },

    async saveDecision() {
      throw new Error("Not used by this test.");
    },
  };
}

function createCatalogProvider(onCall?: () => void): CatalogProvider {
  return {
    async getCurrentCatalog() {
      onCall?.();

      return {
        version: "2026-08-demo-v1",
        items: [
          {
            id: "hotel_room_night",
            name: "Hotel room",
            currency: "SEK",
            unitPriceMinor: 150_000,
            pricingBasis: "per_room_night",
            active: true,
          },
        ],
      };
    },
  };
}

function createDraftRepository(options?: { readonly failCreate?: boolean }): {
  readonly repository: ProposalDraftRepository;
  getSavedDraft(): ProposalDraft | null;
  getCreateCalls(): number;
} {
  let savedDraft: ProposalDraft | null = null;

  let createCalls = 0;

  return {
    repository: {
      async create(draft) {
        createCalls += 1;

        if (options?.failCreate) {
          throw new Error("Database unavailable.");
        }

        savedDraft = draft;
      },

      async findById(id) {
        return savedDraft?.id === id ? savedDraft : null;
      },
    },

    getSavedDraft() {
      return savedDraft;
    },

    getCreateCalls() {
      return createCalls;
    },
  };
}

describe("proposal draft application workflow", () => {
  it("does not load the catalog when extraction does not exist", async () => {
    let catalogCalls = 0;

    const drafts = createDraftRepository();

    const result = await createProposalDraft(
      {
        reviewRepository: createReviewRepository(null),
        catalogProvider: createCatalogProvider(() => {
          catalogCalls += 1;
        }),
        proposalDraftRepository: drafts.repository,
        generateId: () => draftId,
        now: () => new Date(),
      },
      {
        inquiryId,
        selections: [
          {
            catalogItemId: "hotel_room_night",
            occurrences: 1,
          },
        ],
      },
    );

    expect(result).toEqual({
      status: "not_extracted",
    });

    expect(catalogCalls).toBe(0);

    expect(drafts.getCreateCalls()).toBe(0);
  });

  it("does not load the catalog while human review remains unresolved", async () => {
    let catalogCalls = 0;

    const drafts = createDraftRepository();

    const result = await createProposalDraft(
      {
        reviewRepository: createReviewRepository(reviewRequiredExtraction),
        catalogProvider: createCatalogProvider(() => {
          catalogCalls += 1;
        }),
        proposalDraftRepository: drafts.repository,
        generateId: () => draftId,
        now: () => new Date(),
      },
      {
        inquiryId,
        selections: [
          {
            catalogItemId: "hotel_room_night",
            occurrences: 1,
          },
        ],
      },
    );

    expect(result).toEqual({
      status: "review_required",
    });

    expect(catalogCalls).toBe(0);

    expect(drafts.getCreateCalls()).toBe(0);
  });

  it("persists resolved inquiry and authoritative pricing snapshots", async () => {
    const drafts = createDraftRepository();

    const createdAt = new Date("2026-08-27T13:00:00.000Z");

    const result = await createProposalDraft(
      {
        reviewRepository: createReviewRepository(readyExtraction),
        catalogProvider: createCatalogProvider(),
        proposalDraftRepository: drafts.repository,
        generateId: () => draftId,
        now: () => createdAt,
      },
      {
        inquiryId,
        selections: [
          {
            catalogItemId: "hotel_room_night",
            occurrences: 1,
          },
        ],
      },
    );

    expect(result.status).toBe("ready");

    if (result.status !== "ready") {
      throw new Error("Expected ready proposal draft.");
    }

    expect(result.draft.id).toBe(draftId);

    expect(result.draft.status).toBe("draft");

    expect(result.draft.catalogVersion).toBe("2026-08-demo-v1");

    expect(result.draft.resolvedInquiry).toEqual({
      guests: 20,
      rooms: 10,
      startDate: "2026-10-14",
      endDate: "2026-10-16",
      budgetCents: 5_000_000,
      requirements: ["company offsite"],
    });

    expect(result.draft.pricing.totalMinor).toBe(3_000_000);

    expect(drafts.getSavedDraft()).toEqual(result.draft);
  });

  it("uses catalog pricing rather than caller authority", async () => {
    const drafts = createDraftRepository();

    const result = await createProposalDraft(
      {
        reviewRepository: createReviewRepository(readyExtraction),
        catalogProvider: createCatalogProvider(),
        proposalDraftRepository: drafts.repository,
        generateId: () => draftId,
        now: () => new Date("2026-08-27T13:00:00.000Z"),
      },
      {
        inquiryId,
        selections: [
          {
            catalogItemId: "hotel_room_night",
            occurrences: 1,
          },
        ],
      },
    );

    if (result.status !== "ready") {
      throw new Error("Expected ready proposal draft.");
    }

    expect(result.draft.pricing.lines[0]?.unitPriceMinor).toBe(150_000);

    expect(result.draft.pricing.lines[0]?.quantity).toBe(20);
  });

  it("propagates deterministic pricing errors without persisting a draft", async () => {
    const drafts = createDraftRepository();

    await expect(
      createProposalDraft(
        {
          reviewRepository: createReviewRepository(readyExtraction),
          catalogProvider: createCatalogProvider(),
          proposalDraftRepository: drafts.repository,
          generateId: () => draftId,
          now: () => new Date(),
        },
        {
          inquiryId,
          selections: [
            {
              catalogItemId: "unknown_item",
              occurrences: 1,
            },
          ],
        },
      ),
    ).rejects.toMatchObject({
      code: "UNKNOWN_CATALOG_ITEM",
    });

    expect(drafts.getCreateCalls()).toBe(0);
  });

  it("propagates repository failures", async () => {
    const drafts = createDraftRepository({
      failCreate: true,
    });

    await expect(
      createProposalDraft(
        {
          reviewRepository: createReviewRepository(readyExtraction),
          catalogProvider: createCatalogProvider(),
          proposalDraftRepository: drafts.repository,
          generateId: () => draftId,
          now: () => new Date(),
        },
        {
          inquiryId,
          selections: [
            {
              catalogItemId: "hotel_room_night",
              occurrences: 1,
            },
          ],
        },
      ),
    ).rejects.toThrow("Database unavailable.");
  });

  it("loads a persisted proposal draft by identifier", async () => {
    const drafts = createDraftRepository();

    const created = await createProposalDraft(
      {
        reviewRepository: createReviewRepository(readyExtraction),
        catalogProvider: createCatalogProvider(),
        proposalDraftRepository: drafts.repository,
        generateId: () => draftId,
        now: () => new Date("2026-08-27T13:00:00.000Z"),
      },
      {
        inquiryId,
        selections: [
          {
            catalogItemId: "hotel_room_night",
            occurrences: 1,
          },
        ],
      },
    );

    if (created.status !== "ready") {
      throw new Error("Expected ready proposal draft.");
    }

    const loaded = await getProposalDraft(
      {
        proposalDraftRepository: drafts.repository,
      },
      draftId,
    );

    expect(loaded).toEqual(created.draft);
  });
});
