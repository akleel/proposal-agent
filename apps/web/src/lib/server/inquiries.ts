import "server-only";

import { randomUUID } from "node:crypto";

import { OpenAIInquiryExtractor } from "@proposal-agent/ai";
import {
  createInquiry,
  extractInquiry,
  getInquiry,
} from "@proposal-agent/application";
import { PostgresInquiryRepository } from "@proposal-agent/db";
import { getReviewIssues } from "@proposal-agent/domain";

import { getDatabasePool } from "./database";

function createInquiryRepository() {
  return new PostgresInquiryRepository(getDatabasePool());
}

function createInquiryExtractor(): OpenAIInquiryExtractor {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY for server-side inquiry extraction.",
    );
  }

  const model = process.env.OPENAI_MODEL;

  if (model) {
    return new OpenAIInquiryExtractor({
      apiKey,
      model,
    });
  }

  return new OpenAIInquiryExtractor({
    apiKey,
  });
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

export async function extractPersistedInquiryUseCase(
  id: string,
) {
  const inquiry = await getInquiryUseCase(id);

  if (!inquiry) {
    return null;
  }

  const extraction = await extractInquiry(
    {
      extractor: createInquiryExtractor(),
    },
    {
      rawText: inquiry.rawText,
    },
  );

  return {
    extraction,
    reviewIssues: getReviewIssues(extraction),
  };
}
