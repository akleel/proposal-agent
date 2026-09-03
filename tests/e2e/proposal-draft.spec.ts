import { expect, test, type Locator, type Page } from "@playwright/test";

import type { InquiryExtraction } from "../../packages/domain/src/index";

import {
  deleteInquiryById,
  deleteProposalDraftById,
  seedInquiryExtraction,
} from "./support/database";

const inquiryText =
  "We are planning a company offsite for 20 people. " +
  "We need 10 hotel rooms from 2026-10-14 to 2026-10-16. " +
  "Our budget is SEK 50,000. " +
  "We need a meeting room for 2 days, breakfast twice, " +
  "dinner once, and late checkout.";

const catalogItemIds = [
  "hotel_room_night",
  "meeting_room_day",
  "breakfast_person",
  "dinner_person",
  "late_checkout_room",
] as const;

const proposalApiSelections = [
  {
    catalogItemId: "hotel_room_night",
    occurrences: 1,
  },
  {
    catalogItemId: "meeting_room_day",
    occurrences: 2,
  },
  {
    catalogItemId: "breakfast_person",
    occurrences: 2,
  },
  {
    catalogItemId: "dinner_person",
    occurrences: 1,
  },
  {
    catalogItemId: "late_checkout_room",
    occurrences: 1,
  },
] as const;

interface ProposalApiResponse {
  readonly proposal: {
    readonly id: string;
    readonly inquiryId: string;
    readonly status: "draft";
    readonly catalogVersion: string;
    readonly createdAt: string;
    readonly pricing: {
      readonly currency: "SEK";
      readonly totalMinor: number;
    };
  };
}

function createDeterministicExtraction(): InquiryExtraction {
  return {
    guests: {
      value: 20,
      confidence: 0.99,
      source: "20 people",
      requiresReview: false,
    },
    rooms: {
      value: 10,
      confidence: 0.99,
      source: "10 hotel rooms",
      requiresReview: false,
    },
    startDate: {
      value: "2026-10-14",
      confidence: 0.99,
      source: "2026-10-14",
      requiresReview: false,
    },
    endDate: {
      value: null,
      confidence: 0,
      source: null,
      requiresReview: true,
    },
    budgetCents: {
      value: 5_000_000,
      confidence: 0.99,
      source: "SEK 50,000",
      requiresReview: false,
    },
    requirements: [
      {
        value: "company offsite",
        confidence: 0.95,
        source: "company offsite",
        requiresReview: false,
      },
      {
        value: "meeting room for 2 days",
        confidence: 0.99,
        source: "meeting room for 2 days",
        requiresReview: false,
      },
      {
        value: "breakfast twice",
        confidence: 0.99,
        source: "breakfast twice",
        requiresReview: false,
      },
      {
        value: "dinner once",
        confidence: 0.99,
        source: "dinner once",
        requiresReview: false,
      },
      {
        value: "late checkout",
        confidence: 0.99,
        source: "late checkout",
        requiresReview: false,
      },
    ],
  };
}

async function createInquiry(page: Page): Promise<string> {
  await page.goto("/inquiries/new");

  await page.getByLabel("Customer inquiry").fill(inquiryText);

  await Promise.all([
    page.waitForURL(
      /\/inquiries\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    ),
    page
      .getByRole("button", {
        name: "Create inquiry",
      })
      .click(),
  ]);

  const match = page.url().match(/\/inquiries\/([0-9a-f-]+)$/i);

  if (!match?.[1]) {
    throw new Error("Could not read inquiry identifier from URL.");
  }

  return match[1];
}

async function expectMinorAmount(locator: Locator, expectedMinor: number): Promise<void> {
  await expect(locator).toBeVisible();

  const text = await locator.textContent();

  if (!text) {
    throw new Error("Expected a rendered currency amount.");
  }

  const digits = text.replace(/\D/g, "");

  expect(digits).toBe(String(expectedMinor));
}

async function expectPricingRow(
  page: Page,
  name: string,
  quantity: number,
  lineTotalMinor: number,
): Promise<void> {
  const row = page.getByRole("row").filter({
    hasText: name,
  });

  await expect(row).toHaveCount(1);

  const cells = row.locator("td");

  await expect(cells.nth(1)).toHaveText(String(quantity));

  await expectMinorAmount(cells.nth(3), lineTotalMinor);
}

async function resolveInquiryReview(page: Page): Promise<void> {
  await page.getByLabel("Corrected value").fill("2026-10-16");

  await page
    .getByRole("button", {
      name: "Save correction",
    })
    .click();

  await expect(
    page.getByRole("heading", {
      name: "Resolved inquiry ready",
    }),
  ).toBeVisible();
}

async function selectPricing(page: Page): Promise<void> {
  for (const catalogItemId of catalogItemIds) {
    await page
      .locator(`input[type="checkbox"][name="catalogItemId"][value="${catalogItemId}"]`)
      .check();
  }

  await page.locator('input[name="occurrences:meeting_room_day"]').fill("2");

  await page.locator('input[name="occurrences:breakfast_person"]').fill("2");

  await page.locator('input[name="occurrences:dinner_person"]').fill("1");
}

async function expectProposalSnapshot(
  page: Page,
  inquiryId: string,
  proposalId: string,
): Promise<void> {
  await expect(page.getByTestId("proposal-draft")).toBeVisible();

  await expect(
    page.getByRole("heading", {
      name: "Review-ready proposal draft",
    }),
  ).toBeVisible();

  await expect(page.getByTestId("proposal-status")).toHaveText("Draft · not approved · not sent");

  await expect(page.getByTestId("proposal-catalog-version")).toHaveText("2026-08-demo-v1");

  await expect(page.getByTestId("proposal-inquiry-id")).toHaveText(inquiryId);

  await expect(
    page.getByText(proposalId, {
      exact: true,
    }),
  ).toBeVisible();

  await expect(page.getByTestId("proposal-guests")).toHaveText("20");

  await expect(page.getByTestId("proposal-rooms")).toHaveText("10");

  await expect(page.getByTestId("proposal-start-date")).toHaveText("2026-10-14");

  await expect(page.getByTestId("proposal-end-date")).toHaveText("2026-10-16");

  await expectPricingRow(page, "Hotel room", 20, 3_000_000);

  await expectPricingRow(page, "Meeting room", 2, 1_200_000);

  await expectPricingRow(page, "Breakfast", 40, 720_000);

  await expectPricingRow(page, "Dinner", 20, 900_000);

  await expectPricingRow(page, "Late checkout", 10, 300_000);

  await expectMinorAmount(page.getByTestId("proposal-total"), 6_120_000);

  const budgetStatus = page.getByTestId("proposal-budget-status");

  await expect(budgetStatus).toContainText("over customer budget");

  await expectMinorAmount(budgetStatus, 1_120_000);

  await expect(
    page.getByText("company offsite", {
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByText("late checkout", {
      exact: true,
    }),
  ).toBeVisible();
}

test("creates and reloads a persisted review-ready proposal draft", async ({ page }) => {
  let inquiryId: string | null = null;

  let proposalId: string | null = null;

  let apiProposalId: string | null = null;

  try {
    inquiryId = await createInquiry(page);

    await seedInquiryExtraction(inquiryId, createDeterministicExtraction());

    await page.reload();

    await expect(
      page.getByText("1 unresolved of 1", {
        exact: true,
      }),
    ).toBeVisible();

    await resolveInquiryReview(page);

    const createApiResponse = await page.request.post("/api/proposals", {
      data: {
        inquiryId,
        selections: proposalApiSelections,
      },
    });

    expect(createApiResponse.status()).toBe(201);

    const createApiBody = (await createApiResponse.json()) as ProposalApiResponse;

    apiProposalId = createApiBody.proposal.id;

    expect(createApiBody.proposal.inquiryId).toBe(inquiryId);
    expect(createApiBody.proposal.status).toBe("draft");
    expect(createApiBody.proposal.catalogVersion).toBe("2026-08-demo-v1");
    expect(createApiBody.proposal.pricing.currency).toBe("SEK");
    expect(createApiBody.proposal.pricing.totalMinor).toBe(6_120_000);
    expect(Number.isNaN(Date.parse(createApiBody.proposal.createdAt))).toBe(false);

    expect(createApiResponse.headers()["location"]).toBe(`/api/proposals/${apiProposalId}`);

    const getApiResponse = await page.request.get(`/api/proposals/${apiProposalId}`);

    expect(getApiResponse.status()).toBe(200);

    const getApiBody = (await getApiResponse.json()) as ProposalApiResponse;

    expect(getApiBody.proposal.id).toBe(apiProposalId);
    expect(getApiBody.proposal.inquiryId).toBe(inquiryId);
    expect(getApiBody.proposal.pricing.totalMinor).toBe(6_120_000);

    await selectPricing(page);

    await page
      .getByRole("button", {
        name: "Calculate pricing",
      })
      .click();

    await expectMinorAmount(page.getByTestId("pricing-total"), 6_120_000);

    const createDraftButton = page.getByTestId("create-proposal-draft");

    await expect(createDraftButton).toBeEnabled();

    await Promise.all([
      page.waitForURL(
        /\/proposals\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      ),
      createDraftButton.click(),
    ]);

    const proposalMatch = page.url().match(/\/proposals\/([0-9a-f-]+)$/i);

    if (!proposalMatch?.[1]) {
      throw new Error("Could not read proposal draft identifier from URL.");
    }

    proposalId = proposalMatch[1];

    await expectProposalSnapshot(page, inquiryId, proposalId);

    const proposalUrl = page.url();

    await page.reload();

    expect(page.url()).toBe(proposalUrl);

    await expectProposalSnapshot(page, inquiryId, proposalId);
  } finally {
    if (proposalId) {
      await deleteProposalDraftById(proposalId);
    }

    if (apiProposalId) {
      await deleteProposalDraftById(apiProposalId);
    }

    if (inquiryId) {
      await deleteInquiryById(inquiryId);
    }
  }
});
