import type { Pool } from "pg";

export interface PersistedInquiryCatalogMatch {
  readonly inquiryId: string;
  readonly inputHash: string;
  readonly matchedVariationIds: readonly number[];
  readonly unmatchedRequirementIndexes: readonly number[];
  readonly resolvedAt: Date;
}

interface InquiryCatalogMatchRow {
  readonly inquiry_id: string;
  readonly input_hash: string;
  readonly matched_variation_ids: unknown;
  readonly unmatched_requirement_indexes: unknown;
  readonly resolved_at: Date;
}

function parseIntegerArray(value: unknown, minimum: number, label: string): readonly number[] {
  if (
    !Array.isArray(value) ||
    value.some(
      (entry) => typeof entry !== "number" || !Number.isSafeInteger(entry) || entry < minimum,
    )
  ) {
    throw new Error(`Persisted ${label} are invalid.`);
  }

  return value as number[];
}

function mapRow(row: InquiryCatalogMatchRow): PersistedInquiryCatalogMatch {
  if (
    typeof row.inquiry_id !== "string" ||
    row.inquiry_id.length === 0 ||
    typeof row.input_hash !== "string" ||
    !/^[a-f0-9]{64}$/.test(row.input_hash) ||
    !(row.resolved_at instanceof Date) ||
    Number.isNaN(row.resolved_at.getTime())
  ) {
    throw new Error("Persisted inquiry catalog match is invalid.");
  }

  return {
    inquiryId: row.inquiry_id,
    inputHash: row.input_hash,
    matchedVariationIds: parseIntegerArray(
      row.matched_variation_ids,
      1,
      "matched variation identifiers",
    ),
    unmatchedRequirementIndexes: parseIntegerArray(
      row.unmatched_requirement_indexes,
      0,
      "unmatched requirement indexes",
    ),
    resolvedAt: row.resolved_at,
  };
}

export class PostgresInquiryCatalogMatchRepository {
  public constructor(private readonly pool: Pool) {}

  public async findByInquiryId(inquiryId: string): Promise<PersistedInquiryCatalogMatch | null> {
    const result = await this.pool.query<InquiryCatalogMatchRow>(
      `
        SELECT
          inquiry_id,
          input_hash,
          matched_variation_ids,
          unmatched_requirement_indexes,
          resolved_at
        FROM inquiry_catalog_matches
        WHERE inquiry_id = $1
      `,
      [inquiryId],
    );

    const row = result.rows[0];

    return row ? mapRow(row) : null;
  }

  public async save(match: PersistedInquiryCatalogMatch): Promise<void> {
    if (!/^[a-f0-9]{64}$/.test(match.inputHash)) {
      throw new Error("Inquiry catalog match input hash is invalid.");
    }

    await this.pool.query(
      `
        INSERT INTO inquiry_catalog_matches (
          inquiry_id,
          input_hash,
          matched_variation_ids,
          unmatched_requirement_indexes,
          resolved_at
        )
        VALUES (
          $1,
          $2,
          $3::jsonb,
          $4::jsonb,
          $5
        )
        ON CONFLICT (inquiry_id)
        DO UPDATE SET
          input_hash = EXCLUDED.input_hash,
          matched_variation_ids = EXCLUDED.matched_variation_ids,
          unmatched_requirement_indexes =
            EXCLUDED.unmatched_requirement_indexes,
          resolved_at = EXCLUDED.resolved_at
      `,
      [
        match.inquiryId,
        match.inputHash,
        JSON.stringify(match.matchedVariationIds),
        JSON.stringify(match.unmatchedRequirementIndexes),
        match.resolvedAt,
      ],
    );
  }
}
