export interface Inquiry {
  readonly id: string;
  readonly rawText: string;
  readonly createdAt: Date;
}

export interface ReviewableField<T> {
  readonly value: T;
  readonly confidence: number;
  readonly source: string | null;
  readonly requiresReview: boolean;
}

export interface InquiryExtraction {
  readonly guests: ReviewableField<number | null>;
  readonly rooms: ReviewableField<number | null>;
  readonly startDate: ReviewableField<string | null>;
  readonly endDate: ReviewableField<string | null>;
  readonly budgetCents: ReviewableField<number | null>;
  readonly requirements: readonly ReviewableField<string>[];
}

export interface ReviewIssue {
  readonly field: string;
  readonly source: string | null;
  readonly confidence: number;
}

export function getReviewIssues(extraction: InquiryExtraction): readonly ReviewIssue[] {
  const fields: ReadonlyArray<readonly [string, ReviewableField<unknown>]> = [
    ["guests", extraction.guests],
    ["rooms", extraction.rooms],
    ["startDate", extraction.startDate],
    ["endDate", extraction.endDate],
    ["budgetCents", extraction.budgetCents],
  ];

  const fieldIssues = fields
    .filter(([, field]) => field.requiresReview)
    .map(([field, value]) => ({
      field,
      source: value.source,
      confidence: value.confidence,
    }));

  const requirementIssues = extraction.requirements
    .map((requirement, index) => ({ requirement, index }))
    .filter(({ requirement }) => requirement.requiresReview)
    .map(({ requirement, index }) => ({
      field: `requirements.${index}`,
      source: requirement.source,
      confidence: requirement.confidence,
    }));

  return [...fieldIssues, ...requirementIssues];
}
