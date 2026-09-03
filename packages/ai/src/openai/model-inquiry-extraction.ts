import {
  isoDateSchema,
} from "@proposal-agent/contracts";
import { z } from "zod";

const confidenceSchema = z
  .number()
  .min(0)
  .max(1)
  .describe(
    "Confidence from 0 to 1 that the extracted value is directly supported by the inquiry.",
  );

const sourceSchema = z
  .string()
  .min(1)
  .nullable()
  .describe(
    "A short exact excerpt supporting the value. Use null when the inquiry contains no supporting text.",
  );

function modelFieldSchema<T extends z.ZodType>(
  valueSchema: T,
) {
  return z.object({
    value: valueSchema,
    confidence: confidenceSchema,
    source: sourceSchema,
  });
}

export const modelInquiryExtractionSchema = z.object({
  guests: modelFieldSchema(
    z
      .number()
      .int()
      .positive()
      .nullable()
      .describe(
        "Number of guests explicitly stated or safely extractable from the inquiry.",
      ),
  ),

  rooms: modelFieldSchema(
    z
      .number()
      .int()
      .nonnegative()
      .nullable()
      .describe(
        "Number of rooms explicitly requested. Use null when not stated.",
      ),
  ),

  startDate: modelFieldSchema(
    isoDateSchema.nullable(),
  ),

  endDate: modelFieldSchema(
    isoDateSchema.nullable(),
  ),

  budgetCents: modelFieldSchema(
    z
      .number()
      .int()
      .nonnegative()
      .nullable()
      .describe(
        "Explicit customer budget in SEK minor units. Use null unless the source explicitly identifies SEK. Never convert another currency to SEK.",
      ),
  ),

  requirements: z.array(
    modelFieldSchema(
      z
        .string()
        .min(1)
        .describe(
          "A concise customer requirement directly supported by the inquiry.",
        ),
    ),
  ),
});

export type ModelInquiryExtraction = z.infer<
  typeof modelInquiryExtractionSchema
>;
