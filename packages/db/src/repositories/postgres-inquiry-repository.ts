import type { InquiryRepository } from "@proposal-agent/application";
import type { Inquiry } from "@proposal-agent/domain";
import type { Pool } from "pg";

interface InquiryRow {
  readonly id: string;
  readonly raw_text: string;
  readonly created_at: Date;
}

function mapInquiryRow(row: InquiryRow): Inquiry {
  return {
    id: row.id,
    rawText: row.raw_text,
    createdAt: row.created_at,
  };
}

export class PostgresInquiryRepository implements InquiryRepository {
  public constructor(private readonly pool: Pool) {}

  public async create(inquiry: Inquiry): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO inquiries (id, raw_text, created_at)
        VALUES ($1, $2, $3)
      `,
      [inquiry.id, inquiry.rawText, inquiry.createdAt],
    );
  }

  public async findById(id: string): Promise<Inquiry | null> {
    const result = await this.pool.query<InquiryRow>(
      `
        SELECT id, raw_text, created_at
        FROM inquiries
        WHERE id = $1
      `,
      [id],
    );

    const row = result.rows[0];

    return row ? mapInquiryRow(row) : null;
  }
}
