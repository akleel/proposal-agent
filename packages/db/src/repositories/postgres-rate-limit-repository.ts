import type { Pool } from "pg";

export interface RateLimitRule {
  readonly scope: string;
  readonly keyHash: string;
  readonly windowStart: Date;
  readonly limit: number;
}

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly blockedScope: string | null;
}

interface CountRow {
  readonly request_count: number;
}

function validateRule(rule: RateLimitRule): void {
  if (!rule.scope.trim()) {
    throw new Error("Rate-limit scope must not be empty.");
  }

  if (!/^[a-f0-9]{64}$/.test(rule.keyHash)) {
    throw new Error("Rate-limit key must be a SHA-256 compatible hex digest.");
  }

  if (!Number.isSafeInteger(rule.limit) || rule.limit <= 0) {
    throw new Error("Rate-limit limit must be a positive safe integer.");
  }

  if (Number.isNaN(rule.windowStart.getTime())) {
    throw new Error("Rate-limit window start must be a valid date.");
  }
}

export class PostgresRateLimitRepository {
  public constructor(private readonly pool: Pool) {}

  public async consumeAll(rules: readonly RateLimitRule[]): Promise<RateLimitDecision> {
    if (rules.length === 0) {
      throw new Error("At least one rate-limit rule is required.");
    }

    for (const rule of rules) {
      validateRule(rule);
    }

    const client = await this.pool.connect();

    try {
      // Visitor and global limits must be consumed together; the transaction prevents
      // a rejected request from incrementing only part of its rate-limit state.
      await client.query("BEGIN");

      for (const rule of rules) {
        const result = await client.query<CountRow>(
          `
              INSERT INTO demo_rate_limits (
                scope,
                key_hash,
                window_start,
                request_count
              )
              VALUES ($1, $2, $3, 1)
              ON CONFLICT (
                scope,
                key_hash,
                window_start
              )
              DO UPDATE
              SET request_count =
                demo_rate_limits.request_count + 1
              WHERE
                demo_rate_limits.request_count < $4
              RETURNING request_count
            `,
          [rule.scope, rule.keyHash, rule.windowStart, rule.limit],
        );

        if (!result.rows[0]) {
          await client.query("ROLLBACK");

          return {
            allowed: false,
            blockedScope: rule.scope,
          };
        }
      }

      await client.query("COMMIT");

      return {
        allowed: true,
        blockedScope: null,
      };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original database error.
      }

      throw error;
    } finally {
      client.release();
    }
  }
}
