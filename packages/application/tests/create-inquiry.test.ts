import { describe, expect, it } from "vitest";

import { createInquiry } from "../src/index";
import { InMemoryInquiryRepository } from "./in-memory-inquiry-repository";

describe("createInquiry", () => {
  it("creates and persists a normalized inquiry", async () => {
    const repository = new InMemoryInquiryRepository();

    const id = "3ac7f2de-7430-47d6-b63f-9c899eafd248";
    const now = new Date("2026-08-24T10:00:00.000Z");

    const inquiry = await createInquiry(
      {
        repository,
        generateId: () => id,
        now: () => now,
      },
      {
        rawText: "   We need 45 rooms for our company offsite.   ",
      },
    );

    expect(inquiry).toEqual({
      id,
      rawText: "We need 45 rooms for our company offsite.",
      createdAt: now,
    });

    await expect(repository.findById(id)).resolves.toEqual(inquiry);
  });

  it("rejects blank inquiry text defensively", async () => {
    const repository = new InMemoryInquiryRepository();

    await expect(
      createInquiry(
        {
          repository,
          generateId: () => "3ac7f2de-7430-47d6-b63f-9c899eafd248",
          now: () => new Date(),
        },
        {
          rawText: "   ",
        },
      ),
    ).rejects.toThrow("Inquiry text cannot be empty.");
  });
});
