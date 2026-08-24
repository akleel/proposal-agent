import "server-only";

import { randomUUID } from "node:crypto";

import {
  createInquiry,
  getInquiry,
} from "@proposal-agent/application";
import { PostgresInquiryRepository } from "@proposal-agent/db";

import { getDatabasePool } from "./database";

function createInquiryRepository() {
  return new PostgresInquiryRepository(getDatabasePool());
}

export async function createInquiryUseCase(rawText: string) {
  return createInquiry(
    {
      repository: createInquiryRepository(),
      generateId: randomUUID,
      now: () => new Date(),
    },
    {
      rawText,
    },
  );
}

export async function getInquiryUseCase(id: string) {
  return getInquiry(
    {
      repository: createInquiryRepository(),
    },
    id,
  );
}
