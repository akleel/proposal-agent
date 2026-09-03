import {
  fileURLToPath,
} from "node:url";

import type {
  InquiryExtraction,
} from "@proposal-agent/domain";
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
  PostgresInquiryReviewRepository,
  runMigrations,
} from "../../src/index";
import {
  requireEnv,
} from "../../src/env";

const migrationsDirectory =
  fileURLToPath(
    new URL(
      "../../migrations/",
      import.meta.url,
    ),
  );

const pool =
  createDatabasePool(
    requireEnv("TEST_DATABASE_URL"),
  );

const inquiryRepository =
  new PostgresInquiryRepository(pool);

const reviewRepository =
  new PostgresInquiryReviewRepository(pool);

function createExtraction():
  InquiryExtraction {
  return {
    guests: {
      value: 65,
      confidence: 0.99,
      source: "65 people",
      requiresReview: false,
    },
    rooms: {
      value: 35,
      confidence: 0.99,
      source: "35 rooms",
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
      value: 18_000_000,
      confidence: 0.99,
      source: "SEK 180,000",
      requiresReview: false,
    },
    requirements: [
      {
        value: "late checkout",
        confidence: 0.94,
        source:
          "preferably late checkout",
        requiresReview: true,
      },
    ],
  };
}

beforeAll(async () => {
  await runMigrations(
    pool,
    migrationsDirectory,
  );
});

beforeEach(async () => {
  await pool.query(
    "TRUNCATE TABLE inquiries CASCADE",
  );
});

afterAll(async () => {
  await pool.end();
});

describe(
  "PostgresInquiryReviewRepository",
  () => {
    it(
      "persists extraction and human decisions",
      async () => {
        const inquiry = {
          id:
            "3ac7f2de-7430-47d6-b63f-9c899eafd248",
          rawText:
            "65 people with preferably late checkout.",
          createdAt:
            new Date(
              "2026-08-25T08:00:00.000Z",
            ),
        };

        await inquiryRepository.create(
          inquiry,
        );

        const extraction =
          createExtraction();

        await reviewRepository.replaceExtraction(
          inquiry.id,
          extraction,
          new Date(
            "2026-08-25T08:01:00.000Z",
          ),
        );

        await reviewRepository.saveDecision(
          inquiry.id,
          {
            field: "requirements.0",
            kind: "accepted",
            resolvedValue:
              "late checkout",
            reviewedAt:
              new Date(
                "2026-08-25T08:02:00.000Z",
              ),
          },
        );

        const persisted =
          await reviewRepository.findByInquiryId(
            inquiry.id,
          );

        expect(
          persisted?.extraction,
        ).toEqual(extraction);

        expect(
          persisted?.decisions,
        ).toEqual([
          {
            field: "requirements.0",
            kind: "accepted",
            resolvedValue:
              "late checkout",
            reviewedAt:
              new Date(
                "2026-08-25T08:02:00.000Z",
              ),
          },
        ]);
      },
    );

    it(
      "clears stale decisions when extraction is replaced",
      async () => {
        const inquiry = {
          id:
            "3ac7f2de-7430-47d6-b63f-9c899eafd248",
          rawText:
            "65 people with preferably late checkout.",
          createdAt:
            new Date(
              "2026-08-25T08:00:00.000Z",
            ),
        };

        await inquiryRepository.create(
          inquiry,
        );

        const extraction =
          createExtraction();

        await reviewRepository.replaceExtraction(
          inquiry.id,
          extraction,
          new Date(
            "2026-08-25T08:01:00.000Z",
          ),
        );

        await reviewRepository.saveDecision(
          inquiry.id,
          {
            field: "requirements.0",
            kind: "accepted",
            resolvedValue:
              "late checkout",
            reviewedAt:
              new Date(
                "2026-08-25T08:02:00.000Z",
              ),
          },
        );

        await reviewRepository.replaceExtraction(
          inquiry.id,
          extraction,
          new Date(
            "2026-08-25T08:03:00.000Z",
          ),
        );

        const persisted =
          await reviewRepository.findByInquiryId(
            inquiry.id,
          );

        expect(
          persisted?.decisions,
        ).toEqual([]);
      },
    );

    it(
      "rejects malformed persisted extraction JSON",
      async () => {
        const inquiry = {
          id:
            "3ac7f2de-7430-47d6-b63f-9c899eafd248",
          rawText:
            "Malformed extraction boundary test.",
          createdAt:
            new Date(
              "2026-08-25T08:00:00.000Z",
            ),
        };

        await inquiryRepository.create(
          inquiry,
        );

        const extraction =
          createExtraction();

        await pool.query(
          `
            INSERT INTO inquiry_extractions (
              inquiry_id,
              extraction,
              extracted_at
            )
            VALUES ($1, $2::jsonb, $3)
          `,
          [
            inquiry.id,
            JSON.stringify({
              ...extraction,
              guests: {
                ...extraction.guests,
                confidence: "invalid",
              },
            }),
            new Date(
              "2026-08-25T08:01:00.000Z",
            ),
          ],
        );

        await expect(
          reviewRepository.findByInquiryId(
            inquiry.id,
          ),
        ).rejects.toThrow(
          "Persisted inquiry extraction is invalid.",
        );
      },
    );
  },
);
