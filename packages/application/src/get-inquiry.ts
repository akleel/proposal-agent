import type { Inquiry } from "@proposal-agent/domain";

import type { InquiryRepository } from "./inquiry-repository";

export interface GetInquiryDependencies {
  readonly repository: InquiryRepository;
}

export async function getInquiry(
  dependencies: GetInquiryDependencies,
  id: string,
): Promise<Inquiry | null> {
  return dependencies.repository.findById(id);
}
