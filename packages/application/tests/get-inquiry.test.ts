import { describe, expect, it } from "vitest";

import { getInquiry } from "../src/index";
import { InMemoryInquiryRepository } from "./in-memory-inquiry-repository";

describe("getInquiry", () => {
  it("returns an existing inquiry", async () => {
    const repository = new InMemoryInquiryRepository();

    const inquiry = {
      id: "3ac7f2de-7430-47d6-b63f-9c899eafd248",
      rawText: "We need 45 rooms for our company offsite.",
      createdAt: new Date("2026-08-24T10:00:00.000Z"),
    };

    await repository.create(inquiry);

    await expect(
      getInquiry(
        {
          repository,
        },
        inquiry.id,
      ),
    ).resolves.toEqual(inquiry);
  });

  it("returns null for an unknown inquiry", async () => {
    const repository = new InMemoryInquiryRepository();

    await expect(
      getInquiry(
        {
          repository,
        },
        "87be958b-8903-4bbd-a48b-0c19d57af064",
      ),
    ).resolves.toBeNull();
  });
});
