// packages/ai/scripts/eval-bookings.ts

import { GeminiInquiryExtractor } from "../src/index";
import {
  BOOKING_EVAL_CASES,
  BOOKING_EVAL_CONTEXT,
  type BookingEvalCase,
  type CatalogProductTitle,
  validateBookingEvalCases,
} from "./booking-eval-cases";

const DEFAULT_MODEL = "gemini-3.6-flash";
const DEFAULT_DELAY_MS = 500;

const CATALOG_PRODUCT_TITLES: readonly CatalogProductTitle[] = [
  "Standard Single Room",
  "Standard Double Room",
  "Superior Room with View",
  "Suite",
  "Meeting Room",
  "Breakfast",
  "Dinner",
  "Late Checkout",
];

interface CaseEvaluation {
  readonly id: string;
  readonly guests: boolean;
  readonly rooms: boolean;
  readonly startDate: boolean;
  readonly endDate: boolean;
  readonly products: boolean;
  readonly excludedProducts: boolean;
  readonly passed: boolean;
  readonly differences: readonly string[];
}

interface EvaluationSummary {
  total: number;
  passed: number;
  guests: number;
  rooms: number;
  startDate: number;
  endDate: number;
  products: number;
  excludedProducts: number;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchCurrentCatalogProducts(
  requirements: readonly string[],
): ReadonlySet<CatalogProductTitle> {
  const matched = new Set<CatalogProductTitle>();

  for (const requirement of requirements) {
    const normalizedRequirement = normalizeText(requirement);

    for (const title of CATALOG_PRODUCT_TITLES) {
      const normalizedTitle = normalizeText(title);

      if (normalizedRequirement.includes(normalizedTitle)) {
        matched.add(title);
      }
    }
  }

  return matched;
}

function setsEqual<T extends string>(left: ReadonlySet<T>, right: ReadonlySet<T>): boolean {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
}

function sortedValues<T extends string>(values: ReadonlySet<T>): readonly T[] {
  return [...values].sort();
}

function formatValue(value: string | number | null): string {
  return value === null ? "null" : JSON.stringify(value);
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function readDelayMs(): number {
  const configured = process.env.EVAL_DELAY_MS;

  if (!configured) {
    return DEFAULT_DELAY_MS;
  }

  const parsed = Number.parseInt(configured, 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(
      `EVAL_DELAY_MS must be a non-negative integer, received ${JSON.stringify(configured)}.`,
    );
  }

  return parsed;
}

async function evaluateCase(
  extractor: GeminiInquiryExtractor,
  testCase: BookingEvalCase,
): Promise<CaseEvaluation> {
  const extraction = await extractor.extract(testCase.inquiry);

  const actualRequirements = extraction.requirements.map((requirement) => requirement.value);

  const actualProducts = matchCurrentCatalogProducts(actualRequirements);

  const expectedProducts = new Set<CatalogProductTitle>(
    testCase.expected.products.map((product) => product.title),
  );

  const guests = extraction.guests.value === testCase.expected.guests;
  const rooms = extraction.rooms.value === testCase.expected.rooms;
  const startDate = extraction.startDate.value === testCase.expected.startDate;
  const endDate = extraction.endDate.value === testCase.expected.endDate;
  const products = setsEqual(actualProducts, expectedProducts);

  const excludedProducts = testCase.expected.excludedProducts.every(
    (product) => !actualProducts.has(product),
  );

  const differences: string[] = [];

  if (!guests) {
    differences.push(
      `guests expected=${formatValue(testCase.expected.guests)} actual=${formatValue(extraction.guests.value)}`,
    );
  }

  if (!rooms) {
    differences.push(
      `rooms expected=${formatValue(testCase.expected.rooms)} actual=${formatValue(extraction.rooms.value)}`,
    );
  }

  if (!startDate) {
    differences.push(
      `startDate expected=${formatValue(testCase.expected.startDate)} actual=${formatValue(extraction.startDate.value)}`,
    );
  }

  if (!endDate) {
    differences.push(
      `endDate expected=${formatValue(testCase.expected.endDate)} actual=${formatValue(extraction.endDate.value)}`,
    );
  }

  if (!products) {
    differences.push(
      `products expected=${JSON.stringify(sortedValues(expectedProducts))} actual=${JSON.stringify(sortedValues(actualProducts))}`,
    );
    differences.push(`requirements=${JSON.stringify(actualRequirements)}`);
  }

  if (!excludedProducts) {
    const incorrectlySelected = testCase.expected.excludedProducts.filter((product) =>
      actualProducts.has(product),
    );

    differences.push(
      `excluded products incorrectly selected=${JSON.stringify(incorrectlySelected)}`,
    );
  }

  const passed = guests && rooms && startDate && endDate && products && excludedProducts;

  return {
    id: testCase.id,
    guests,
    rooms,
    startDate,
    endDate,
    products,
    excludedProducts,
    passed,
    differences,
  };
}

function createSummary(): EvaluationSummary {
  return {
    total: 0,
    passed: 0,
    guests: 0,
    rooms: 0,
    startDate: 0,
    endDate: 0,
    products: 0,
    excludedProducts: 0,
  };
}

function addToSummary(summary: EvaluationSummary, evaluation: CaseEvaluation): void {
  summary.total += 1;
  summary.passed += Number(evaluation.passed);
  summary.guests += Number(evaluation.guests);
  summary.rooms += Number(evaluation.rooms);
  summary.startDate += Number(evaluation.startDate);
  summary.endDate += Number(evaluation.endDate);
  summary.products += Number(evaluation.products);
  summary.excludedProducts += Number(evaluation.excludedProducts);
}

function percentage(passed: number, total: number): string {
  if (total === 0) {
    return "0.0%";
  }

  return `${((passed / total) * 100).toFixed(1)}%`;
}

function printMetric(label: string, passed: number, total: number): void {
  console.log(
    `${label.padEnd(25)} ${String(passed).padStart(3)}/${total}  ${percentage(passed, total)}`,
  );
}

function printSummary(summary: EvaluationSummary): void {
  console.log("");
  console.log("============================================================");
  console.log("BOOKING BASELINE");
  console.log("============================================================");

  printMetric("Full case pass", summary.passed, summary.total);
  printMetric("Guests", summary.guests, summary.total);
  printMetric("Rooms", summary.rooms, summary.total);
  printMetric("Start date", summary.startDate, summary.total);
  printMetric("End date", summary.endDate, summary.total);
  printMetric("Product set", summary.products, summary.total);
  printMetric("Excluded-product safety", summary.excludedProducts, summary.total);

  console.log("");
  console.log("Quantity is intentionally not included in the LLM baseline.");
}

async function main(): Promise<void> {
  validateBookingEvalCases();

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY. Load apps/web/.env.local when running this script.");
  }

  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const delayMs = readDelayMs();

  const extractor = new GeminiInquiryExtractor({
    apiKey,
    model,
  });

  const summary = createSummary();

  console.log("============================================================");
  console.log("BOOKING EVAL — CURRENT BASELINE");
  console.log("============================================================");
  console.log(`Cases:          ${BOOKING_EVAL_CASES.length}`);
  console.log(`Model:          ${model}`);
  console.log(`Reference date: ${BOOKING_EVAL_CONTEXT.referenceDate}`);
  console.log(`Timezone:       ${BOOKING_EVAL_CONTEXT.timezone}`);
  console.log(`Delay:          ${delayMs}ms`);
  console.log("");
  console.log("The current production extractor is evaluated unchanged.");
  console.log("The reference date above is NOT injected into the current Gemini prompt.");
  console.log("");

  let index = 0;

  for (const testCase of BOOKING_EVAL_CASES) {
    index += 1;

    let evaluation: CaseEvaluation;

    try {
      evaluation = await evaluateCase(extractor, testCase);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`Evaluation stopped at ${testCase.id}: ${message}`, {
        cause: error,
      });
    }

    addToSummary(summary, evaluation);

    const status = evaluation.passed ? "PASS" : "FAIL";

    console.log(
      `[${String(index).padStart(3, "0")}/${BOOKING_EVAL_CASES.length}] ${testCase.id} ${status}`,
    );

    if (!evaluation.passed) {
      for (const difference of evaluation.differences) {
        console.log(`  - ${difference}`);
      }
    }

    if (index < BOOKING_EVAL_CASES.length && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  printSummary(summary);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error("");
  console.error(`Booking evaluation failed: ${message}`);
  process.exitCode = 1;
});
