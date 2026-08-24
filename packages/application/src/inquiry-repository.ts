import type { Inquiry } from "@proposal-agent/domain";

export interface InquiryRepository {
  create(inquiry: Inquiry): Promise<void>;
  findById(id: string): Promise<Inquiry | null>;
}
