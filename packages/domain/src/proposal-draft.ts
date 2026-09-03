import type {
  CatalogSelection,
  PricingBasis,
  PricingLine,
  PricingResult,
} from "./pricing";
import {
  isValidIsoDate,
} from "./iso-date";
import type {
  ResolvedInquiry,
} from "./resolved-inquiry";

export type ProposalDraftStatus =
  "draft";

export interface ProposalDraft {
  readonly id: string;
  readonly inquiryId: string;
  readonly status:
    ProposalDraftStatus;
  readonly catalogVersion: string;
  readonly resolvedInquiry:
    ResolvedInquiry;
  readonly selections:
    readonly CatalogSelection[];
  readonly pricing:
    PricingResult;
  readonly createdAt: Date;
}

export interface CreateProposalDraftInput {
  readonly id: string;
  readonly inquiryId: string;
  readonly resolvedInquiry:
    ResolvedInquiry;
  readonly selections:
    readonly CatalogSelection[];
  readonly pricing:
    PricingResult;
  readonly createdAt: Date;
}

export class ProposalDraftError
  extends Error {
  public constructor(
    message: string,
  ) {
    super(message);
    this.name =
      "ProposalDraftError";
  }
}

const pricingBases:
  ReadonlySet<PricingBasis> =
  new Set([
    "per_person",
    "per_room",
    "per_room_night",
    "per_day",
    "flat",
  ]);

function fail(
  message: string,
): never {
  throw new ProposalDraftError(
    message,
  );
}

function assertNonBlankText(
  name: string,
  value: string,
): void {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    fail(
      `${name} must be non-empty text.`,
    );
  }
}

function assertSafeInteger(
  name: string,
  value: number,
  minimum:
    number = 0,
): void {
  if (
    !Number.isSafeInteger(value) ||
    value < minimum
  ) {
    fail(
      `${name} must be a safe integer greater than or equal to ${minimum}.`,
    );
  }
}

function assertNullableSafeInteger(
  name: string,
  value: number | null,
  minimum: number,
): void {
  if (value === null) {
    return;
  }

  assertSafeInteger(
    name,
    value,
    minimum,
  );
}

function validateOptionalDate(
  name: string,
  value: string | null,
): void {
  if (value === null) {
    return;
  }

  if (!isValidIsoDate(value)) {
    fail(
      `${name} must be a valid YYYY-MM-DD date or null.`,
    );
  }
}

function validateResolvedInquiry(
  inquiry: ResolvedInquiry,
): void {
  assertNullableSafeInteger(
    "resolvedInquiry.guests",
    inquiry.guests,
    1,
  );

  assertNullableSafeInteger(
    "resolvedInquiry.rooms",
    inquiry.rooms,
    0,
  );

  validateOptionalDate(
    "resolvedInquiry.startDate",
    inquiry.startDate,
  );

  validateOptionalDate(
    "resolvedInquiry.endDate",
    inquiry.endDate,
  );

  assertNullableSafeInteger(
    "resolvedInquiry.budgetCents",
    inquiry.budgetCents,
    0,
  );

  for (
    const requirement
    of inquiry.requirements
  ) {
    assertNonBlankText(
      "resolvedInquiry requirement",
      requirement,
    );
  }
}

function validateSelections(
  selections:
    readonly CatalogSelection[],
): void {
  if (selections.length === 0) {
    fail(
      "Proposal draft selections must not be empty.",
    );
  }

  const identifiers =
    new Set<string>();

  for (
    const selection
    of selections
  ) {
    assertNonBlankText(
      "catalogItemId",
      selection.catalogItemId,
    );

    assertSafeInteger(
      "selection occurrences",
      selection.occurrences,
      1,
    );

    if (
      identifiers.has(
        selection.catalogItemId,
      )
    ) {
      fail(
        `Duplicate proposal draft selection: ${selection.catalogItemId}.`,
      );
    }

    identifiers.add(
      selection.catalogItemId,
    );
  }
}

function validatePricingLine(
  line: PricingLine,
): void {
  assertNonBlankText(
    "pricing line catalogItemId",
    line.catalogItemId,
  );

  assertNonBlankText(
    "pricing line name",
    line.name,
  );

  if (
    !pricingBases.has(
      line.pricingBasis,
    )
  ) {
    fail(
      `Invalid pricing basis for ${line.catalogItemId}.`,
    );
  }

  assertSafeInteger(
    "pricing line quantity",
    line.quantity,
    1,
  );

  assertSafeInteger(
    "pricing line unit price",
    line.unitPriceMinor,
    0,
  );

  assertSafeInteger(
    "pricing line total",
    line.lineTotalMinor,
    0,
  );

  const expectedLineTotal =
    line.quantity *
    line.unitPriceMinor;

  if (
    !Number.isSafeInteger(
      expectedLineTotal,
    ) ||
    expectedLineTotal !==
      line.lineTotalMinor
  ) {
    fail(
      `Pricing line total is inconsistent for ${line.catalogItemId}.`,
    );
  }
}

function validatePricing(
  pricing: PricingResult,
  inquiry: ResolvedInquiry,
  selections:
    readonly CatalogSelection[],
): void {
  assertNonBlankText(
    "pricing catalogVersion",
    pricing.catalogVersion,
  );

  if (
    pricing.currency !== "SEK"
  ) {
    fail(
      "Proposal draft pricing currency must be SEK.",
    );
  }

  if (
    pricing.lines.length !==
    selections.length
  ) {
    fail(
      "Proposal draft selections and pricing lines must have the same length.",
    );
  }

  const lineIdentifiers =
    new Set<string>();

  let expectedTotal = 0;

  for (
    const [
      index,
      line,
    ] of pricing.lines.entries()
  ) {
    const selection =
      selections[index];

    if (!selection) {
      fail(
        "Proposal draft pricing line has no matching selection.",
      );
    }

    validatePricingLine(
      line,
    );

    if (
      lineIdentifiers.has(
        line.catalogItemId,
      )
    ) {
      fail(
        `Duplicate pricing line: ${line.catalogItemId}.`,
      );
    }

    lineIdentifiers.add(
      line.catalogItemId,
    );

    if (
      line.catalogItemId !==
      selection.catalogItemId
    ) {
      fail(
        "Proposal draft selection order must match pricing line order.",
      );
    }

    expectedTotal +=
      line.lineTotalMinor;

    if (
      !Number.isSafeInteger(
        expectedTotal,
      )
    ) {
      fail(
        "Proposal draft pricing total exceeds safe integer limits.",
      );
    }
  }

  assertSafeInteger(
    "pricing total",
    pricing.totalMinor,
    0,
  );

  if (
    pricing.totalMinor !==
    expectedTotal
  ) {
    fail(
      "Proposal draft pricing total is inconsistent with its lines.",
    );
  }

  if (
    pricing.budgetMinor !==
    inquiry.budgetCents
  ) {
    fail(
      "Proposal draft pricing budget must match the resolved inquiry snapshot.",
    );
  }

  if (
    pricing.budgetMinor === null
  ) {
    if (
      pricing.differenceFromBudgetMinor !==
        null ||
      pricing.withinBudget !==
        null
    ) {
      fail(
        "Proposal draft pricing without a budget cannot contain budget comparison values.",
      );
    }

    return;
  }

  assertSafeInteger(
    "pricing budget",
    pricing.budgetMinor,
    0,
  );

  const expectedDifference =
    pricing.totalMinor -
    pricing.budgetMinor;

  if (
    !Number.isSafeInteger(
      expectedDifference,
    )
  ) {
    fail(
      "Proposal draft budget difference exceeds safe integer limits.",
    );
  }

  if (
    pricing.differenceFromBudgetMinor !==
    expectedDifference
  ) {
    fail(
      "Proposal draft budget difference is inconsistent.",
    );
  }

  const expectedWithinBudget =
    pricing.totalMinor <=
    pricing.budgetMinor;

  if (
    pricing.withinBudget !==
    expectedWithinBudget
  ) {
    fail(
      "Proposal draft within-budget flag is inconsistent.",
    );
  }
}

function cloneResolvedInquiry(
  inquiry: ResolvedInquiry,
): ResolvedInquiry {
  return {
    guests:
      inquiry.guests,
    rooms:
      inquiry.rooms,
    startDate:
      inquiry.startDate,
    endDate:
      inquiry.endDate,
    budgetCents:
      inquiry.budgetCents,
    requirements: [
      ...inquiry.requirements,
    ],
  };
}

function cloneSelections(
  selections:
    readonly CatalogSelection[],
): readonly CatalogSelection[] {
  return selections.map(
    (selection) => ({
      catalogItemId:
        selection.catalogItemId,
      occurrences:
        selection.occurrences,
    }),
  );
}

function clonePricingLine(
  line: PricingLine,
): PricingLine {
  return {
    catalogItemId:
      line.catalogItemId,
    name:
      line.name,
    pricingBasis:
      line.pricingBasis,
    quantity:
      line.quantity,
    unitPriceMinor:
      line.unitPriceMinor,
    lineTotalMinor:
      line.lineTotalMinor,
  };
}

function clonePricing(
  pricing: PricingResult,
): PricingResult {
  return {
    catalogVersion:
      pricing.catalogVersion,
    currency:
      pricing.currency,
    lines:
      pricing.lines.map(
        clonePricingLine,
      ),
    totalMinor:
      pricing.totalMinor,
    budgetMinor:
      pricing.budgetMinor,
    differenceFromBudgetMinor:
      pricing.differenceFromBudgetMinor,
    withinBudget:
      pricing.withinBudget,
  };
}

export function createProposalDraft(
  input:
    CreateProposalDraftInput,
): ProposalDraft {
  assertNonBlankText(
    "Proposal draft id",
    input.id,
  );

  assertNonBlankText(
    "Proposal draft inquiryId",
    input.inquiryId,
  );

  if (
    !(input.createdAt instanceof Date) ||
    Number.isNaN(
      input.createdAt.getTime(),
    )
  ) {
    fail(
      "Proposal draft createdAt must be a valid Date.",
    );
  }

  validateResolvedInquiry(
    input.resolvedInquiry,
  );

  validateSelections(
    input.selections,
  );

  validatePricing(
    input.pricing,
    input.resolvedInquiry,
    input.selections,
  );

  return {
    id:
      input.id,
    inquiryId:
      input.inquiryId,
    status: "draft",
    catalogVersion:
      input.pricing.catalogVersion,
    resolvedInquiry:
      cloneResolvedInquiry(
        input.resolvedInquiry,
      ),
    selections:
      cloneSelections(
        input.selections,
      ),
    pricing:
      clonePricing(
        input.pricing,
      ),
    createdAt:
      new Date(
        input.createdAt.getTime(),
      ),
  };
}
