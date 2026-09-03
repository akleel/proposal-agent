import "server-only";

import { createHmac } from "node:crypto";

import {
  PostgresRateLimitRepository,
  type RateLimitDecision,
  type RateLimitRule,
} from "@proposal-agent/db";
import { headers } from "next/headers";

import { getDatabasePool } from "./database";

const VISITOR_LIMIT = 5;
const VISITOR_WINDOW_MS = 15 * 60 * 1000;

const GLOBAL_LIMIT = 30;
const GLOBAL_WINDOW_MS = 60 * 60 * 1000;

const WRITE_VISITOR_LIMIT = 20;
const WRITE_VISITOR_WINDOW_MS = 15 * 60 * 1000;

const WRITE_GLOBAL_LIMIT = 200;
const WRITE_GLOBAL_WINDOW_MS = 60 * 60 * 1000;

interface HeaderReader {
  get(name: string): string | null;
}

function getRateLimitSecret(): string | null {
  const secret = process.env.DEMO_RATE_LIMIT_SECRET?.trim();

  if (secret) {
    if (secret.length < 32) {
      throw new Error("DEMO_RATE_LIMIT_SECRET must contain at least 32 characters.");
    }

    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing DEMO_RATE_LIMIT_SECRET for the public demo.");
  }

  return null;
}

function getFixedWindowStart(now: Date, windowMs: number): Date {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

function getVisitorAddress(headerReader: HeaderReader): string {
  const forwardedFor = headerReader.get("x-forwarded-for");

  if (forwardedFor) {
    const firstAddress = forwardedFor.split(",")[0]?.trim();

    if (firstAddress) {
      return firstAddress;
    }
  }

  const realIp = headerReader.get("x-real-ip")?.trim();

  if (realIp) {
    return realIp;
  }

  return "unknown";
}

function hashRateLimitKey(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value, "utf8").digest("hex");
}

function createRules(secret: string, visitorAddress: string, now: Date): readonly RateLimitRule[] {
  return [
    {
      scope: "demo-ai-visitor-15m",
      keyHash: hashRateLimitKey(secret, `visitor:${visitorAddress}`),
      windowStart: getFixedWindowStart(now, VISITOR_WINDOW_MS),
      limit: VISITOR_LIMIT,
    },
    {
      scope: "demo-ai-global-1h",
      keyHash: hashRateLimitKey(secret, "proposal-agent:global"),
      windowStart: getFixedWindowStart(now, GLOBAL_WINDOW_MS),
      limit: GLOBAL_LIMIT,
    },
  ];
}

function createWriteRules(
  secret: string,
  visitorAddress: string,
  now: Date,
): readonly RateLimitRule[] {
  return [
    {
      scope: "demo-write-visitor-15m",
      keyHash: hashRateLimitKey(secret, `visitor:${visitorAddress}`),
      windowStart: getFixedWindowStart(now, WRITE_VISITOR_WINDOW_MS),
      limit: WRITE_VISITOR_LIMIT,
    },
    {
      scope: "demo-write-global-1h",
      keyHash: hashRateLimitKey(secret, "proposal-agent:write-global"),
      windowStart: getFixedWindowStart(now, WRITE_GLOBAL_WINDOW_MS),
      limit: WRITE_GLOBAL_LIMIT,
    },
  ];
}
export async function consumeDemoAiRateLimit(): Promise<RateLimitDecision> {
  const secret = getRateLimitSecret();

  if (!secret) {
    return {
      allowed: true,
      blockedScope: null,
    };
  }

  const requestHeaders = await headers();

  const visitorAddress = getVisitorAddress(requestHeaders);

  const repository = new PostgresRateLimitRepository(getDatabasePool());

  return repository.consumeAll(createRules(secret, visitorAddress, new Date()));
}

export async function consumeDemoWriteRateLimit(): Promise<RateLimitDecision> {
  const secret = getRateLimitSecret();

  if (!secret) {
    return {
      allowed: true,
      blockedScope: null,
    };
  }

  const requestHeaders = await headers();

  const visitorAddress = getVisitorAddress(requestHeaders);

  const repository = new PostgresRateLimitRepository(getDatabasePool());

  return repository.consumeAll(createWriteRules(secret, visitorAddress, new Date()));
}
