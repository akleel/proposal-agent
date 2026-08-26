import type {
  InquiryReviewRepository,
  PersistedInquiryReview,
} from "@proposal-agent/application";
import type {
  InquiryExtraction,
  InquiryReviewDecision,
  InquiryReviewDecisionKind,
  InquiryReviewResolvedValue,
} from "@proposal-agent/domain";
import type {
  Pool,
} from "pg";

interface ReviewRow {
  readonly inquiry_id: string;
  readonly extraction: unknown;
  readonly extracted_at: Date | string;
  readonly decisions: unknown;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function parseExtraction(
  value: unknown,
): InquiryExtraction {
  if (!isRecord(value)) {
    throw new Error(
      "Persisted inquiry extraction is invalid.",
    );
  }

  const fieldNames = [
    "guests",
    "rooms",
    "startDate",
    "endDate",
    "budgetCents",
  ] as const;

  for (const fieldName of fieldNames) {
    if (!isRecord(value[fieldName])) {
      throw new Error(
        "Persisted inquiry extraction is invalid.",
      );
    }
  }

  if (!Array.isArray(value.requirements)) {
    throw new Error(
      "Persisted inquiry extraction is invalid.",
    );
  }

  return value as unknown as InquiryExtraction;
}

function parseDate(
  value: Date | string,
): Date {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      "Persisted review timestamp is invalid.",
    );
  }

  return date;
}

function parseDecisionKind(
  value: unknown,
): InquiryReviewDecisionKind {
  if (
    value === "accepted" ||
    value === "corrected"
  ) {
    return value;
  }

  throw new Error(
    "Persisted review decision kind is invalid.",
  );
}

function parseResolvedValue(
  value: unknown,
): InquiryReviewResolvedValue {
  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  throw new Error(
    "Persisted resolved review value is invalid.",
  );
}

function parseDecision(
  value: unknown,
): InquiryReviewDecision {
  if (!isRecord(value)) {
    throw new Error(
      "Persisted review decision is invalid.",
    );
  }

  if (typeof value.field !== "string") {
    throw new Error(
      "Persisted review decision field is invalid.",
    );
  }

  if (
    typeof value.reviewedAt !== "string"
  ) {
    throw new Error(
      "Persisted review timestamp is invalid.",
    );
  }

  return {
    field: value.field,
    kind: parseDecisionKind(value.kind),
    resolvedValue:
      parseResolvedValue(
        value.resolvedValue,
      ),
    reviewedAt:
      parseDate(value.reviewedAt),
  };
}

function mapReviewRow(
  row: ReviewRow,
): PersistedInquiryReview {
  if (!Array.isArray(row.decisions)) {
    throw new Error(
      "Persisted review decisions are invalid.",
    );
  }

  return {
    inquiryId: row.inquiry_id,
    extraction:
      parseExtraction(row.extraction),
    extractedAt:
      parseDate(row.extracted_at),
    decisions:
      row.decisions.map(parseDecision),
  };
}

export class PostgresInquiryReviewRepository
  implements InquiryReviewRepository
{
  public constructor(
    private readonly pool: Pool,
  ) {}

  public async replaceExtraction(
    inquiryId: string,
    extraction: InquiryExtraction,
    extractedAt: Date,
  ): Promise<void> {
    const client =
      await this.pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `
          INSERT INTO inquiry_extractions (
            inquiry_id,
            extraction,
            extracted_at
          )
          VALUES ($1, $2::jsonb, $3)
          ON CONFLICT (inquiry_id)
          DO UPDATE SET
            extraction = EXCLUDED.extraction,
            extracted_at = EXCLUDED.extracted_at
        `,
        [
          inquiryId,
          JSON.stringify(extraction),
          extractedAt,
        ],
      );

      await client.query(
        `
          DELETE FROM inquiry_review_decisions
          WHERE inquiry_id = $1
        `,
        [inquiryId],
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async findByInquiryId(
    inquiryId: string,
  ): Promise<PersistedInquiryReview | null> {
    const result =
      await this.pool.query<ReviewRow>(
        `
          SELECT
            extraction.inquiry_id,
            extraction.extraction,
            extraction.extracted_at,
            COALESCE(
              jsonb_agg(
                jsonb_build_object(
                  'field',
                  decision.field,
                  'kind',
                  decision.kind,
                  'resolvedValue',
                  decision.resolved_value,
                  'reviewedAt',
                  decision.reviewed_at
                )
                ORDER BY decision.field
              ) FILTER (
                WHERE decision.field IS NOT NULL
              ),
              '[]'::jsonb
            ) AS decisions
          FROM inquiry_extractions AS extraction
          LEFT JOIN inquiry_review_decisions AS decision
            ON decision.inquiry_id =
              extraction.inquiry_id
          WHERE extraction.inquiry_id = $1
          GROUP BY
            extraction.inquiry_id,
            extraction.extraction,
            extraction.extracted_at
        `,
        [inquiryId],
      );

    const row = result.rows[0];

    return row
      ? mapReviewRow(row)
      : null;
  }

  public async saveDecision(
    inquiryId: string,
    decision: InquiryReviewDecision,
  ): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO inquiry_review_decisions (
          inquiry_id,
          field,
          kind,
          resolved_value,
          reviewed_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4::jsonb,
          $5
        )
        ON CONFLICT (inquiry_id, field)
        DO UPDATE SET
          kind = EXCLUDED.kind,
          resolved_value =
            EXCLUDED.resolved_value,
          reviewed_at =
            EXCLUDED.reviewed_at
      `,
      [
        inquiryId,
        decision.field,
        decision.kind,
        JSON.stringify(
          decision.resolvedValue,
        ),
        decision.reviewedAt,
      ],
    );
  }
}
