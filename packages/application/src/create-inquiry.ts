import type { Inquiry } from "@proposal-agent/domain";

import type { InquiryRepository } from "./inquiry-repository";

export interface CreateInquiryInput {
  readonly rawText: string;
}

export interface CreateInquiryDependencies {
  readonly repository: InquiryRepository;
  readonly generateId: () => string;
  readonly now: () => Date;
}

export async function createInquiry(
  dependencies: CreateInquiryDependencies,
  input: CreateInquiryInput,
): Promise<Inquiry> {
  const rawText = input.rawText.trim();

  if (!rawText) {
    throw new Error("Inquiry text cannot be empty.");
  }

  const inquiry: Inquiry = {
    id: dependencies.generateId(),
    rawText,
    createdAt: dependencies.now(),
  };

  await dependencies.repository.create(inquiry);

  return inquiry;
}
