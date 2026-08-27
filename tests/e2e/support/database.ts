import {
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";

import {
  createDatabasePool,
  PostgresInquiryReviewRepository,
} from "../../../packages/db/src/index";
import type {
  InquiryExtraction,
} from "../../../packages/domain/src/index";

function stripOptionalQuotes(
  value: string,
): string {
  if (
    value.length >= 2 &&
    (
      (
        value.startsWith('"') &&
        value.endsWith('"')
      ) ||
      (
        value.startsWith("'") &&
        value.endsWith("'")
      )
    )
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function readWebEnvironmentValue(
  name: string,
): string | null {
  const environmentPath =
    resolve(
      process.cwd(),
      "apps/web/.env.local",
    );

  let contents: string;

  try {
    contents =
      readFileSync(
        environmentPath,
        "utf8",
      );
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }

    throw error;
  }

  for (
    const line
    of contents.split(/\r?\n/)
  ) {
    const trimmed =
      line.trim();

    if (
      !trimmed ||
      trimmed.startsWith("#")
    ) {
      continue;
    }

    const separatorIndex =
      trimmed.indexOf("=");

    if (separatorIndex < 1) {
      continue;
    }

    const key =
      trimmed
        .slice(
          0,
          separatorIndex,
        )
        .trim();

    if (key !== name) {
      continue;
    }

    return stripOptionalQuotes(
      trimmed
        .slice(
          separatorIndex + 1,
        )
        .trim(),
    );
  }

  return null;
}

function requireDatabaseUrl(): string {
  const databaseUrl =
    process.env.DATABASE_URL ??
    readWebEnvironmentValue(
      "DATABASE_URL",
    );

  if (!databaseUrl) {
    throw new Error(
      "Missing DATABASE_URL for Playwright E2E database setup.",
    );
  }

  return databaseUrl;
}

export async function seedInquiryExtraction(
  inquiryId: string,
  extraction: InquiryExtraction,
): Promise<void> {
  const pool =
    createDatabasePool(
      requireDatabaseUrl(),
    );

  try {
    const repository =
      new PostgresInquiryReviewRepository(
        pool,
      );

    await repository.replaceExtraction(
      inquiryId,
      extraction,
      new Date(
        "2026-08-27T10:00:00.000Z",
      ),
    );
  } finally {
    await pool.end();
  }
}

export async function deleteInquiryById(
  inquiryId: string,
): Promise<void> {
  const pool =
    createDatabasePool(
      requireDatabaseUrl(),
    );

  try {
    await pool.query(
      `
        DELETE FROM inquiries
        WHERE id = $1
      `,
      [
        inquiryId,
      ],
    );
  } finally {
    await pool.end();
  }
}
