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

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe(
    "ISO date YYYY-MM-DD. Use null unless the complete date including year is supported by the inquiry.",
  );

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
        "Explicit customer budget in minor currency units. Do not perform currency conversion. Use null if the monetary amount is absent or ambiguous.",
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
