import type { InquiryRepository } from "../src/index";
import type { Inquiry } from "@proposal-agent/domain";

export class InMemoryInquiryRepository
  implements InquiryRepository
{
  private readonly inquiries = new Map<string, Inquiry>();

  public async create(inquiry: Inquiry): Promise<void> {
    this.inquiries.set(inquiry.id, inquiry);
  }

  public async findById(id: string): Promise<Inquiry | null> {
    return this.inquiries.get(id) ?? null;
  }
}
