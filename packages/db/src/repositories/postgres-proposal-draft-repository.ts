import type {
  ProposalDraftRepository,
} from "@proposal-agent/application";
import {
  createProposalDraft,
  type CatalogSelection,
  type PricingResult,
  type ProposalDraft,
  type ResolvedInquiry,
} from "@proposal-agent/domain";
import type {
  Pool,
  QueryResultRow,
} from "pg";

interface ProposalDraftRow
  extends QueryResultRow {
  readonly id: string;
  readonly inquiry_id: string;
  readonly status: string;
  readonly catalog_version: string;
  readonly resolved_inquiry:
    ResolvedInquiry;
  readonly selections:
    CatalogSelection[];
  readonly pricing:
    PricingResult;
  readonly created_at:
    Date;
}

function mapProposalDraftRow(
  row: ProposalDraftRow,
): ProposalDraft {
  if (
    row.status !== "draft"
  ) {
    throw new Error(
      `Unsupported proposal draft status: ${row.status}.`,
    );
  }

  const draft =
    createProposalDraft({
      id:
        row.id,
      inquiryId:
        row.inquiry_id,
      resolvedInquiry:
        row.resolved_inquiry,
      selections:
        row.selections,
      pricing:
        row.pricing,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at
          : new Date(
              row.created_at,
            ),
    });

  if (
    draft.catalogVersion !==
    row.catalog_version
  ) {
    throw new Error(
      "Persisted proposal draft catalog version does not match its pricing snapshot.",
    );
  }

  return draft;
}

export class PostgresProposalDraftRepository
  implements ProposalDraftRepository
{
  public constructor(
    private readonly pool: Pool,
  ) {}

  public async create(
    draft: ProposalDraft,
  ): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO proposal_drafts (
          id,
          inquiry_id,
          status,
          catalog_version,
          resolved_inquiry,
          selections,
          pricing,
          created_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5::jsonb,
          $6::jsonb,
          $7::jsonb,
          $8
        )
      `,
      [
        draft.id,
        draft.inquiryId,
        draft.status,
        draft.catalogVersion,
        JSON.stringify(
          draft.resolvedInquiry,
        ),
        JSON.stringify(
          draft.selections,
        ),
        JSON.stringify(
          draft.pricing,
        ),
        draft.createdAt,
      ],
    );
  }

  public async findById(
    id: string,
  ): Promise<ProposalDraft | null> {
    const result =
      await this.pool.query<ProposalDraftRow>(
        `
          SELECT
            id,
            inquiry_id,
            status,
            catalog_version,
            resolved_inquiry,
            selections,
            pricing,
            created_at
          FROM proposal_drafts
          WHERE id = $1
        `,
        [
          id,
        ],
      );

    const row =
      result.rows[0];

    return row
      ? mapProposalDraftRow(
          row,
        )
      : null;
  }
}
