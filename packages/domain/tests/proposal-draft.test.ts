import {
  describe,
  expect,
  it,
} from "vitest";

import {
  calculatePricing,
  createProposalDraft,
  ProposalDraftError,
  type CatalogSelection,
  type ResolvedInquiry,
} from "../src/index";

const resolvedInquiry:
  ResolvedInquiry = {
    guests: 20,
    rooms: 10,
    startDate:
      "2026-10-14",
    endDate:
      "2026-10-16",
    budgetCents:
      5_000_000,
    requirements: [
      "company offsite",
      "late checkout",
    ],
  };

const selections:
  CatalogSelection[] = [
    {
      catalogItemId:
        "hotel_room_night",
      occurrences: 1,
    },
  ];

function createPricing() {
  return calculatePricing({
    inquiry:
      resolvedInquiry,
    catalogVersion:
      "2026-08-demo-v1",
    catalog: [
      {
        id:
          "hotel_room_night",
        name:
          "Hotel room",
        currency:
          "SEK",
        unitPriceMinor:
          150_000,
        pricingBasis:
          "per_room_night",
        active: true,
      },
    ],
    selections,
  });
}

describe(
  "createProposalDraft",
  () => {
    it(
      "creates an immutable-value snapshot",
      () => {
        const requirements = [
          "company offsite",
          "late checkout",
        ];

        const mutableSelections = [
          {
            catalogItemId:
              "hotel_room_night",
            occurrences: 1,
          },
        ];

        const inquiry = {
          ...resolvedInquiry,
          requirements,
        };

        const pricing =
          calculatePricing({
            inquiry,
            catalogVersion:
              "2026-08-demo-v1",
            catalog: [
              {
                id:
                  "hotel_room_night",
                name:
                  "Hotel room",
                currency:
                  "SEK",
                unitPriceMinor:
                  150_000,
                pricingBasis:
                  "per_room_night",
                active: true,
              },
            ],
            selections:
              mutableSelections,
          });

        const draft =
          createProposalDraft({
            id:
              "77a37479-886a-4a0a-a933-6e065cc5787c",
            inquiryId:
              "3ac7f2de-7430-47d6-b63f-9c899eafd248",
            resolvedInquiry:
              inquiry,
            selections:
              mutableSelections,
            pricing,
            createdAt:
              new Date(
                "2026-08-27T13:00:00.000Z",
              ),
          });

        requirements.push(
          "changed later",
        );

        mutableSelections[0] = {
          catalogItemId:
            "hotel_room_night",
          occurrences: 9,
        };

        expect(
          draft.status,
        ).toBe(
          "draft",
        );

        expect(
          draft.catalogVersion,
        ).toBe(
          "2026-08-demo-v1",
        );

        expect(
          draft.resolvedInquiry
            .requirements,
        ).toEqual([
          "company offsite",
          "late checkout",
        ]);

        expect(
          draft.selections,
        ).toEqual([
          {
            catalogItemId:
              "hotel_room_night",
            occurrences: 1,
          },
        ]);

        expect(
          draft.pricing.totalMinor,
        ).toBe(
          3_000_000,
        );
      },
    );

    it(
      "rejects a pricing budget that differs from the resolved inquiry",
      () => {
        const pricing =
          createPricing();

        expect(
          () =>
            createProposalDraft({
              id:
                "77a37479-886a-4a0a-a933-6e065cc5787c",
              inquiryId:
                "3ac7f2de-7430-47d6-b63f-9c899eafd248",
              resolvedInquiry,
              selections,
              pricing: {
                ...pricing,
                budgetMinor:
                  4_000_000,
              },
              createdAt:
                new Date(),
            }),
        ).toThrow(
          ProposalDraftError,
        );
      },
    );

    it(
      "rejects a tampered pricing line total",
      () => {
        const pricing =
          createPricing();

        const pricingLine =
          pricing.lines[0];

        if (!pricingLine) {
          throw new Error(
            "Expected pricing line fixture.",
          );
        }

        expect(
          () =>
            createProposalDraft({
              id:
                "77a37479-886a-4a0a-a933-6e065cc5787c",
              inquiryId:
                "3ac7f2de-7430-47d6-b63f-9c899eafd248",
              resolvedInquiry,
              selections,
              pricing: {
                ...pricing,
                lines: [
                  {
                    ...pricingLine,
                    lineTotalMinor: 1,
                  },
                ],
              },
              createdAt:
                new Date(),
            }),
        ).toThrow(
          ProposalDraftError,
        );
      },
    );

    it(
      "rejects selections that do not match pricing lines",
      () => {
        expect(
          () =>
            createProposalDraft({
              id:
                "77a37479-886a-4a0a-a933-6e065cc5787c",
              inquiryId:
                "3ac7f2de-7430-47d6-b63f-9c899eafd248",
              resolvedInquiry,
              selections: [
                {
                  catalogItemId:
                    "different_item",
                  occurrences: 1,
                },
              ],
              pricing:
                createPricing(),
              createdAt:
                new Date(),
            }),
        ).toThrow(
          ProposalDraftError,
        );
      },
    );

    it(
      "rejects an invalid creation timestamp",
      () => {
        expect(
          () =>
            createProposalDraft({
              id:
                "77a37479-886a-4a0a-a933-6e065cc5787c",
              inquiryId:
                "3ac7f2de-7430-47d6-b63f-9c899eafd248",
              resolvedInquiry,
              selections,
              pricing:
                createPricing(),
              createdAt:
                new Date(
                  Number.NaN,
                ),
            }),
        ).toThrow(
          ProposalDraftError,
        );
      },
    );
  },
);
