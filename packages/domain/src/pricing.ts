import { isoDateToUtcDay } from "./iso-date";
import type { ResolvedInquiry } from "./resolved-inquiry";

export type Currency = "SEK";

export type PricingBasis = "per_person" | "per_room" | "per_room_night" | "per_day" | "flat";

export interface CatalogItem {
  readonly id: string;
  readonly name: string;
  readonly currency: Currency;
  readonly unitPriceMinor: number;
  readonly pricingBasis: PricingBasis;
  readonly active: boolean;
}

export interface CatalogSelection {
  readonly catalogItemId: string;
  readonly occurrences: number;
}

export interface PricingLine {
  readonly catalogItemId: string;
  readonly name: string;
  readonly pricingBasis: PricingBasis;
  readonly quantity: number;
  readonly unitPriceMinor: number;
  readonly lineTotalMinor: number;
}

export interface PricingResult {
  readonly catalogVersion: string;
  readonly currency: Currency;
  readonly lines: readonly PricingLine[];
  readonly totalMinor: number;
  readonly budgetMinor: number | null;
  readonly differenceFromBudgetMinor: number | null;
  readonly withinBudget: boolean | null;
}

export interface CalculatePricingInput {
  readonly inquiry: ResolvedInquiry;
  readonly catalogVersion: string;
  readonly catalog: readonly CatalogItem[];
  readonly selections: readonly CatalogSelection[];
}

export type PricingErrorCode =
  | "INVALID_CATALOG"
  | "INVALID_CATALOG_VERSION"
  | "DUPLICATE_CATALOG_ITEM"
  | "UNKNOWN_CATALOG_ITEM"
  | "INACTIVE_CATALOG_ITEM"
  | "EMPTY_SELECTIONS"
  | "DUPLICATE_SELECTION"
  | "INVALID_OCCURRENCES"
  | "MISSING_GUEST_COUNT"
  | "INVALID_GUEST_COUNT"
  | "MISSING_ROOM_COUNT"
  | "INVALID_ROOM_COUNT"
  | "MISSING_START_DATE"
  | "MISSING_END_DATE"
  | "INVALID_DATE_RANGE"
  | "INVALID_BUDGET"
  | "ARITHMETIC_OVERFLOW";

export class PricingError extends Error {
  public constructor(
    public readonly code: PricingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PricingError";
  }
}

const pricingBases = new Set<string>([
  "per_person",
  "per_room",
  "per_room_night",
  "per_day",
  "flat",
]);

function assertSafeNonNegativeInteger(
  value: number,
  code: PricingErrorCode,
  message: string,
): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new PricingError(code, message);
  }
}

function safeMultiply(left: number, right: number): number {
  const result = left * right;

  if (!Number.isSafeInteger(result)) {
    throw new PricingError(
      "ARITHMETIC_OVERFLOW",
      "Pricing multiplication exceeded the safe integer range.",
    );
  }

  return result;
}

function safeAdd(left: number, right: number): number {
  const result = left + right;

  if (!Number.isSafeInteger(result)) {
    throw new PricingError("ARITHMETIC_OVERFLOW", "Pricing total exceeded the safe integer range.");
  }

  return result;
}

function parseIsoDateToUtcDay(value: string): number {
  const day = isoDateToUtcDay(value);

  if (day === null) {
    throw new PricingError("INVALID_DATE_RANGE", `Invalid ISO calendar date: ${value}.`);
  }

  return day;
}

function calculateNights(inquiry: ResolvedInquiry): number {
  if (inquiry.startDate === null) {
    throw new PricingError(
      "MISSING_START_DATE",
      "A start date is required for room-night pricing.",
    );
  }

  if (inquiry.endDate === null) {
    throw new PricingError("MISSING_END_DATE", "An end date is required for room-night pricing.");
  }

  const startDay = parseIsoDateToUtcDay(inquiry.startDate);

  const endDay = parseIsoDateToUtcDay(inquiry.endDate);

  const nights = endDay - startDay;

  if (nights <= 0) {
    throw new PricingError("INVALID_DATE_RANGE", "End date must be after start date.");
  }

  return nights;
}

function requireGuests(inquiry: ResolvedInquiry): number {
  if (inquiry.guests === null) {
    throw new PricingError(
      "MISSING_GUEST_COUNT",
      "Guest count is required for per-person pricing.",
    );
  }

  if (!Number.isSafeInteger(inquiry.guests) || inquiry.guests <= 0) {
    throw new PricingError("INVALID_GUEST_COUNT", "Guest count must be a positive safe integer.");
  }

  return inquiry.guests;
}

function requireRooms(inquiry: ResolvedInquiry): number {
  if (inquiry.rooms === null) {
    throw new PricingError("MISSING_ROOM_COUNT", "Room count is required for room-based pricing.");
  }

  if (!Number.isSafeInteger(inquiry.rooms) || inquiry.rooms <= 0) {
    throw new PricingError("INVALID_ROOM_COUNT", "Room count must be a positive safe integer.");
  }

  return inquiry.rooms;
}

function calculateQuantity(
  inquiry: ResolvedInquiry,
  item: CatalogItem,
  occurrences: number,
): number {
  switch (item.pricingBasis) {
    case "per_person":
      return safeMultiply(requireGuests(inquiry), occurrences);

    case "per_room":
      return safeMultiply(requireRooms(inquiry), occurrences);

    case "per_room_night":
      return safeMultiply(
        safeMultiply(requireRooms(inquiry), calculateNights(inquiry)),
        occurrences,
      );

    case "per_day":
    case "flat":
      return occurrences;
  }
}

function validateCatalog(
  catalogVersion: string,
  catalog: readonly CatalogItem[],
): ReadonlyMap<string, CatalogItem> {
  if (typeof catalogVersion !== "string" || catalogVersion.trim().length === 0) {
    throw new PricingError("INVALID_CATALOG_VERSION", "Catalog version must not be blank.");
  }

  if (catalog.length === 0) {
    throw new PricingError("INVALID_CATALOG", "Pricing catalog must not be empty.");
  }

  const items = new Map<string, CatalogItem>();

  for (const item of catalog) {
    if (
      typeof item.id !== "string" ||
      item.id.trim().length === 0 ||
      typeof item.name !== "string" ||
      item.name.trim().length === 0 ||
      item.currency !== "SEK" ||
      !pricingBases.has(item.pricingBasis) ||
      typeof item.active !== "boolean"
    ) {
      throw new PricingError("INVALID_CATALOG", "Catalog contains an invalid item.");
    }

    assertSafeNonNegativeInteger(
      item.unitPriceMinor,
      "INVALID_CATALOG",
      "Catalog prices must be non-negative safe integers.",
    );

    if (items.has(item.id)) {
      throw new PricingError("DUPLICATE_CATALOG_ITEM", `Duplicate catalog item: ${item.id}.`);
    }

    items.set(item.id, item);
  }

  return items;
}

function validateBudget(budget: number | null): void {
  if (budget === null) {
    return;
  }

  assertSafeNonNegativeInteger(
    budget,
    "INVALID_BUDGET",
    "Budget must be a non-negative safe integer.",
  );
}

export function calculatePricing(input: CalculatePricingInput): PricingResult {
  const catalogItems = validateCatalog(input.catalogVersion, input.catalog);

  validateBudget(input.inquiry.budgetCents);

  if (input.selections.length === 0) {
    throw new PricingError("EMPTY_SELECTIONS", "At least one catalog item must be selected.");
  }

  const selectedIds = new Set<string>();

  const lines: PricingLine[] = [];
  let totalMinor = 0;

  for (const selection of input.selections) {
    if (!Number.isSafeInteger(selection.occurrences) || selection.occurrences <= 0) {
      throw new PricingError("INVALID_OCCURRENCES", "Occurrences must be a positive safe integer.");
    }

    if (selectedIds.has(selection.catalogItemId)) {
      throw new PricingError(
        "DUPLICATE_SELECTION",
        `Duplicate selection: ${selection.catalogItemId}.`,
      );
    }

    selectedIds.add(selection.catalogItemId);

    const item = catalogItems.get(selection.catalogItemId);

    if (!item) {
      throw new PricingError(
        "UNKNOWN_CATALOG_ITEM",
        `Unknown catalog item: ${selection.catalogItemId}.`,
      );
    }

    if (!item.active) {
      throw new PricingError("INACTIVE_CATALOG_ITEM", `Catalog item is inactive: ${item.id}.`);
    }

    const quantity = calculateQuantity(input.inquiry, item, selection.occurrences);

    const lineTotalMinor = safeMultiply(quantity, item.unitPriceMinor);

    totalMinor = safeAdd(totalMinor, lineTotalMinor);

    lines.push({
      catalogItemId: item.id,
      name: item.name,
      pricingBasis: item.pricingBasis,
      quantity,
      unitPriceMinor: item.unitPriceMinor,
      lineTotalMinor,
    });
  }

  const budgetMinor = input.inquiry.budgetCents;

  const differenceFromBudgetMinor = budgetMinor === null ? null : totalMinor - budgetMinor;

  const withinBudget = budgetMinor === null ? null : totalMinor <= budgetMinor;

  return {
    catalogVersion: input.catalogVersion,
    currency: "SEK",
    lines,
    totalMinor,
    budgetMinor,
    differenceFromBudgetMinor,
    withinBudget,
  };
}
