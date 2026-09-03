import type { InquiryReviewRepository, ProposalDraftRepository } from "@proposal-agent/application";
import { StaticCatalogProvider } from "@proposal-agent/catalog";
import type { InquiryExtraction, ProposalDraft } from "@proposal-agent/domain";
import { describe, expect, it } from "vitest";

import {
  calculatePricingTool,
  createDraftTool,
  searchProductsTool,
  validateProposalTool,
  type ProposalMcpToolDependencies,
} from "../src/index";

const inquiryId = "3ac7f2de-7430-47d6-b63f-9c899eafd248";

const proposalId = "77a37479-886a-4a0a-a933-6e065cc5787c";

const extraction: InquiryExtraction = {
  guests: {
    value: 20,
    confidence: 0.99,
    source: "20 people",
    requiresReview: false,
  },
  rooms: {
    value: 10,
    confidence: 0.99,
    source: "10 rooms",
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
  requirements: [],
};

function createReviewRepository(): InquiryReviewRepository {
  return {
    async replaceExtraction() {
      throw new Error("Not used by this test.");
    },

    async findByInquiryId(id) {
      if (id !== inquiryId) {
        return null;
      }

      return {
        inquiryId,
        extraction,
        extractedAt: new Date("2026-08-27T14:00:00.000Z"),
        decisions: [],
      };
    },

    async saveDecision() {
      throw new Error("Not used by this test.");
    },
  };
}

function createProposalRepository(): {
  readonly repository: ProposalDraftRepository;
  readonly findSaved: () => ProposalDraft | null;
} {
  let saved: ProposalDraft | null = null;

  return {
    repository: {
      async create(draft) {
        saved = draft;
      },

      async findById(id) {
        return saved?.id === id ? saved : null;
      },
    },

    findSaved() {
      return saved;
    },
  };
}

function createDependencies() {
  const proposals = createProposalRepository();

  const dependencies: ProposalMcpToolDependencies = {
    reviewRepository: createReviewRepository(),
    catalogProvider: new StaticCatalogProvider(),
    proposalDraftRepository: proposals.repository,
    generateId: () => proposalId,
    now: () => new Date("2026-08-27T15:00:00.000Z"),
  };

  return {
    dependencies,
    proposals,
  };
}

describe("Proposal MCP core tools", () => {
  it("search_products exposes configured authoritative products", async () => {
    const { dependencies } = createDependencies();

    const result = await searchProductsTool(dependencies, {
      query: "room",
    });

    expect(result.catalogVersion).toBe("2026-08-demo-v1");

    expect(
      result.products.map((product) => ({
        id: product.id,
        unitPriceMinor: product.unitPriceMinor,
      })),
    ).toEqual([
      {
        id: "hotel_room_night",
        unitPriceMinor: 150_000,
      },
      {
        id: "meeting_room_day",
        unitPriceMinor: 600_000,
      },
      {
        id: "late_checkout_room",
        unitPriceMinor: 30_000,
      },
    ]);
  });

  it("calculate_pricing uses the authoritative catalog price", async () => {
    const { dependencies } = createDependencies();

    const result = await calculatePricingTool(dependencies, {
      inquiryId,
      selections: [
        {
          catalogItemId: "hotel_room_night",
          occurrences: 1,
        },
      ],
    });

    expect(result.status).toBe("ready");

    if (result.status !== "ready") {
      throw new Error("Expected pricing result.");
    }

    expect(result.pricing.lines[0]?.unitPriceMinor).toBe(150_000);

    expect(result.pricing.totalMinor).toBe(3_000_000);
  });

  it("calculate_pricing rejects caller-supplied prices", async () => {
    const { dependencies } = createDependencies();

    await expect(
      calculatePricingTool(dependencies, {
        inquiryId,
        selections: [
          {
            catalogItemId: "hotel_room_night",
            occurrences: 1,
            unitPriceMinor: 1,
          },
        ],
      }),
    ).rejects.toThrow();
  });

  it("create_draft persists only draft state", async () => {
    const { dependencies, proposals } = createDependencies();

    const result = await createDraftTool(dependencies, {
      inquiryId,
      selections: [
        {
          catalogItemId: "hotel_room_night",
          occurrences: 1,
        },
      ],
    });

    expect(result.status).toBe("created");

    if (result.status !== "created") {
      throw new Error("Expected created draft.");
    }

    expect(result.proposalDraft).toMatchObject({
      id: proposalId,
      status: "draft",
      totalMinor: 3_000_000,
    });

    expect(proposals.findSaved()?.status).toBe("draft");
  });

  it("validate_proposal validates the persisted snapshot", async () => {
    const { dependencies } = createDependencies();

    await createDraftTool(dependencies, {
      inquiryId,
      selections: [
        {
          catalogItemId: "hotel_room_night",
          occurrences: 1,
        },
      ],
    });

    const result = await validateProposalTool(dependencies, {
      proposalDraftId: proposalId,
    });

    expect(result).toMatchObject({
      status: "valid_snapshot",
      proposalDraftId: proposalId,
      proposalStatus: "draft",
      totalMinor: 3_000_000,
    });
  });

  it("validate_proposal returns not_found for an unknown draft", async () => {
    const { dependencies } = createDependencies();

    const result = await validateProposalTool(dependencies, {
      proposalDraftId: proposalId,
    });

    expect(result).toEqual({
      status: "not_found",
    });
  });
});
