import {
  expect,
  test,
  type Locator,
  type Page,
} from "@playwright/test";

import type {
  InquiryExtraction,
} from "../../packages/domain/src/index";

import {
  deleteInquiryById,
  seedInquiryExtraction,
} from "./support/database";

const inquiryText =
  "We are planning a company offsite for 20 people. " +
  "We need 10 hotel rooms from 2026-10-14 to 2026-10-16. " +
  "Our budget is SEK 50,000. " +
  "We need a meeting room for 2 days, breakfast twice, " +
  "dinner once, and late checkout.";

function createDeterministicExtraction():
  InquiryExtraction {
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

async function createInquiry(
  page: Page,
): Promise<string> {
  await page.goto(
    "/inquiries/new",
  );

  await page
    .getByLabel(
      "Customer inquiry",
    )
    .fill(
      inquiryText,
    );

  await Promise.all([
    page.waitForURL(
      /\/inquiries\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    ),
    page
      .getByRole(
        "button",
        {
          name:
            "Create inquiry",
        },
      )
      .click(),
  ]);

  const match =
    page
      .url()
      .match(
        /\/inquiries\/([0-9a-f-]+)$/i,
      );

  if (!match) {
    throw new Error(
      "Could not read the created inquiry identifier from the URL.",
    );
  }

  return match[1];
}

async function expectMinorAmount(
  locator: Locator,
  expectedMinor: number,
): Promise<void> {
  await expect(
    locator,
  ).toBeVisible();

  const text =
    await locator.textContent();

  if (!text) {
    throw new Error(
      "Expected a rendered currency amount.",
    );
  }

  const digits =
    text.replace(
      /\D/g,
      "",
    );

  expect(
    digits,
  ).toBe(
    String(
      expectedMinor,
    ),
  );
}

async function expectPricingRow(
  page: Page,
  name: string,
  quantity: number,
  lineTotalMinor: number,
): Promise<void> {
  const row =
    page
      .getByRole(
        "row",
      )
      .filter({
        hasText: name,
      });

  await expect(
    row,
  ).toHaveCount(1);

  const cells =
    row.locator(
      "td",
    );

  await expect(
    cells.nth(1),
  ).toHaveText(
    String(quantity),
  );

  await expectMinorAmount(
    cells.nth(3),
    lineTotalMinor,
  );
}

test(
  "reviews an inquiry and calculates authoritative pricing",
  async ({
    page,
  }) => {
    let inquiryId:
      string | null = null;

    try {
      inquiryId =
        await createInquiry(
          page,
        );

      await seedInquiryExtraction(
        inquiryId,
        createDeterministicExtraction(),
      );

      await page.reload();

      await expect(
        page.getByText(
          "Pricing is locked",
          {
            exact: true,
          },
        ),
      ).toBeVisible();

      await expect(
        page.getByText(
          "1 unresolved of 1",
          {
            exact: true,
          },
        ),
      ).toBeVisible();

      await expect(
        page.getByRole(
          "button",
          {
            name:
              "Calculate pricing",
          },
        ),
      ).toBeDisabled();

      await page
        .getByLabel(
          "Corrected value",
        )
        .fill(
          "2026-10-16",
        );

      await page
        .getByRole(
          "button",
          {
            name:
              "Save correction",
          },
        )
        .click();

      await expect(
        page.getByRole(
          "heading",
          {
            name:
              "Resolved inquiry ready",
          },
        ),
      ).toBeVisible();

      await expect(
        page.getByText(
          "Pricing is locked",
          {
            exact: true,
          },
        ),
      ).toBeHidden();

      const calculateButton =
        page.getByRole(
          "button",
          {
            name:
              "Calculate pricing",
          },
        );

      await expect(
        calculateButton,
      ).toBeEnabled();

      await expect(
        page.getByText(
          /Calculated quantity:\s*20 room-nights/i,
        ),
      ).toBeVisible();

      await expect(
        page.getByText(
          /Calculated quantity:\s*10 rooms/i,
        ),
      ).toBeVisible();

      const selections = [
        "hotel_room_night",
        "meeting_room_day",
        "breakfast_person",
        "dinner_person",
        "late_checkout_room",
      ] as const;

      for (
        const catalogItemId
        of selections
      ) {
        await page
          .locator(
            `input[name="catalogItemId"][value="${catalogItemId}"]`,
          )
          .check();
      }

      await expect(
        page.locator(
          'input[name="occurrences:hotel_room_night"]',
        ),
      ).toHaveValue(
        "1",
      );

      await page
        .locator(
          'input[name="occurrences:meeting_room_day"]',
        )
        .fill(
          "2",
        );

      await page
        .locator(
          'input[name="occurrences:breakfast_person"]',
        )
        .fill(
          "2",
        );

      await page
        .locator(
          'input[name="occurrences:dinner_person"]',
        )
        .fill(
          "1",
        );

      await expect(
        page.locator(
          'input[name="occurrences:late_checkout_room"]',
        ),
      ).toHaveValue(
        "1",
      );

      await calculateButton.click();

      await expect(
        page.getByText(
          /Pricing calculated deterministically from catalog 2026-08-demo-v1\./,
        ),
      ).toBeVisible();

      await expectPricingRow(
        page,
        "Hotel room",
        20,
        3_000_000,
      );

      await expectPricingRow(
        page,
        "Meeting room",
        2,
        1_200_000,
      );

      await expectPricingRow(
        page,
        "Breakfast",
        40,
        720_000,
      );

      await expectPricingRow(
        page,
        "Dinner",
        20,
        900_000,
      );

      await expectPricingRow(
        page,
        "Late checkout",
        10,
        300_000,
      );

      await expectMinorAmount(
        page.getByTestId(
          "pricing-total",
        ),
        6_120_000,
      );

      const budgetStatus =
        page.getByTestId(
          "pricing-budget-status",
        );

      await expect(
        budgetStatus,
      ).toContainText(
        "over customer budget",
      );

      await expectMinorAmount(
        budgetStatus,
        1_120_000,
      );

      for (
        const catalogItemId
        of selections
      ) {
        await page
          .locator(
            `input[name="catalogItemId"][value="${catalogItemId}"]`,
          )
          .uncheck();
      }

      await calculateButton.click();

      await expect(
        page.getByText(
          "Select at least one catalog item and use positive whole-number occurrences.",
          {
            exact: true,
          },
        ),
      ).toBeVisible();

      await expect(
        page.getByTestId(
          "pricing-total",
        ),
      ).toHaveCount(0);
    } finally {
      if (inquiryId) {
        await deleteInquiryById(
          inquiryId,
        );
      }
    }
  },
);
