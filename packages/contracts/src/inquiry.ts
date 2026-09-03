import { z } from "zod";

const confidenceSchema = z.number().min(0).max(1);
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const SEK_CURRENCY_PATTERN = /\bSEK\b/i;

function isLeapYear(year: number): boolean {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}

function getDaysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }

  return 31;
}

function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= getDaysInMonth(year, month);
}

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .refine(isValidIsoDate, "Expected a valid calendar date");

export const reviewableFieldSchema = <T extends z.ZodType>(valueSchema: T) =>
  z.object({
    value: valueSchema,
    confidence: confidenceSchema,
    source: z.string().min(1).nullable(),
    requiresReview: z.boolean(),
  });

const budgetFieldSchema = reviewableFieldSchema(z.number().int().nonnegative().nullable()).refine(
  (field) =>
    field.value === null || (field.source !== null && SEK_CURRENCY_PATTERN.test(field.source)),
  {
    message: "A non-null budget must be explicitly stated in SEK.",
    path: ["source"],
  },
);

export const extractedInquirySchema = z.object({
  guests: reviewableFieldSchema(z.number().int().positive().nullable()),
  rooms: reviewableFieldSchema(z.number().int().nonnegative().nullable()),
  startDate: reviewableFieldSchema(isoDateSchema.nullable()),
  endDate: reviewableFieldSchema(isoDateSchema.nullable()),
  budgetCents: budgetFieldSchema,
  requirements: z.array(reviewableFieldSchema(z.string().min(1))),
});

export type ExtractedInquiryContract = z.infer<typeof extractedInquirySchema>;
