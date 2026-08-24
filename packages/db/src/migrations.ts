import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Pool } from "pg";

interface AppliedMigrationRow {
  readonly filename: string;
  readonly checksum: string;
}

function normalizeMigration(content: string): string {
  return content.replace(/^\uFEFF/, "");
}

function checksum(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export async function runMigrations(
  pool: Pool,
  migrationsDirectory: string,
): Promise<readonly string[]> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const filenames = (await readdir(migrationsDirectory))
    .filter((filename) => /^\d{4}_.+\.sql$/.test(filename))
    .sort();

  const appliedResult = await pool.query<AppliedMigrationRow>(
    "SELECT filename, checksum FROM schema_migrations",
  );

  const applied = new Map(
    appliedResult.rows.map((row) => [row.filename, row.checksum]),
  );

  const newlyApplied: string[] = [];

  for (const filename of filenames) {
    const path = join(migrationsDirectory, filename);
    const rawSql = await readFile(path, "utf8");
    const sql = normalizeMigration(rawSql);

    if (!sql.trim()) {
      throw new Error(`Migration is empty: ${filename}`);
    }

    const migrationChecksum = checksum(sql);
    const existingChecksum = applied.get(filename);

    if (existingChecksum) {
      if (existingChecksum !== migrationChecksum) {
        throw new Error(
          `Previously applied migration was modified: ${filename}`,
        );
      }

      continue;
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(sql);

      await client.query(
        `
          INSERT INTO schema_migrations (filename, checksum)
          VALUES ($1, $2)
        `,
        [filename, migrationChecksum],
      );

      await client.query("COMMIT");

      newlyApplied.push(filename);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  return newlyApplied;
}