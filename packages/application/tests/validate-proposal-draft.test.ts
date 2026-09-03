import {
  calculatePricing,
  createProposalDraft,
  ProposalDraftError,
  type ProposalDraft,
  type ResolvedInquiry,
} from "@proposal-agent/domain";
import { describe, expect, it } from "vitest";

import { validateProposalDraft, type ProposalDraftRepository } from "../src/index";

const proposalId = "77a37479-886a-4a0a-a933-6e065cc5787c";

const inquiryId = "3ac7f2de-7430-47d6-b63f-9c899eafd248";

const inquiry: ResolvedInquiry = {
  guests: 20,
  rooms: 10,
  startDate: "2026-10-14",
  endDate: "2026-10-16",
  budgetCents: 5_000_000,
  requirements: [],
};

function createValidDraft(): ProposalDraft {
  const selections = [
    {
      catalogItemId: "hotel_room_night",
      occurrences: 1,
    },
  ];

  const pricing = calculatePricing({
    inquiry,
    catalogVersion: "catalog-test-v1",
    catalog: [
      {
        id: "hotel_room_night",
        name: "Hotel room",
        currency: "SEK",
        unitPriceMinor: 150_000,
        pricingBasis: "per_room_night",
        active: true,
      },
    ],
    selections,
  });

  return createProposalDraft({
    id: proposalId,
    inquiryId,
    resolvedInquiry: inquiry,
    selections,
    pricing,
    createdAt: new Date("2026-08-27T15:00:00.000Z"),
  });
}

function createRepository(draft: ProposalDraft | null): ProposalDraftRepository {
  return {
    async create() {
      throw new Error("Not used by this test.");
    },

    async findById() {
      return draft;
    },
  };
}

describe("validateProposalDraft", () => {
  it("returns a domain-validated draft", async () => {
    const draft = createValidDraft();

    const result = await validateProposalDraft(
      {
        proposalDraftRepository: createRepository(draft),
      },
      proposalId,
    );

    expect(result.status).toBe("valid");

    if (result.status !== "valid") {
      throw new Error("Expected valid proposal draft.");
    }

    expect(result.draft.id).toBe(proposalId);

    expect(result.draft.status).toBe("draft");
  });

  it("returns not_found for an unknown proposal", async () => {
    const result = await validateProposalDraft(
      {
        proposalDraftRepository: createRepository(null),
      },
      proposalId,
    );

    expect(result).toEqual({
      status: "not_found",
    });
  });

  it("rejects a tampered persisted snapshot", async () => {
    const valid = createValidDraft();

    const line = valid.pricing.lines[0];

    if (!line) {
      throw new Error("Expected pricing line fixture.");
    }

    const tampered: ProposalDraft = {
      ...valid,
      pricing: {
        ...valid.pricing,
        lines: [
          {
            ...line,
            lineTotalMinor: 1,
          },
        ],
      },
    };

    await expect(
      validateProposalDraft(
        {
          proposalDraftRepository: createRepository(tampered),
        },
        proposalId,
      ),
    ).rejects.toBeInstanceOf(ProposalDraftError);
  });
});
