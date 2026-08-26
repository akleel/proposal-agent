import {
  getReviewIssues,
  type InquiryExtraction,
  type ReviewableField,
} from "./inquiry";
import {
  createInquiryReviewDecision,
  type InquiryReviewDecision,
} from "./review-decision";

export interface ResolvedInquiry {
  readonly guests: number | null;
  readonly rooms: number | null;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly budgetCents: number | null;
  readonly requirements: readonly string[];
}

export class InquiryResolutionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "InquiryResolutionError";
  }
}

function validateDecision(
  extraction: InquiryExtraction,
  decision: InquiryReviewDecision,
): void {
  try {
    const input =
      decision.kind === "accepted"
        ? {
            field: decision.field,
            kind: decision.kind,
          }
        : {
            field: decision.field,
            kind: decision.kind,
            correctedValue: String(
              decision.resolvedValue,
            ),
          };

    const validated =
      createInquiryReviewDecision(
        extraction,
        input,
        decision.reviewedAt,
      );

    if (
      validated.resolvedValue !==
      decision.resolvedValue
    ) {
      throw new InquiryResolutionError(
        `Persisted decision for ${decision.field} does not match the current extraction.`,
      );
    }
  } catch (error) {
    if (
      error instanceof InquiryResolutionError
    ) {
      throw error;
    }

    throw new InquiryResolutionError(
      `Persisted decision for ${decision.field} is invalid.`,
    );
  }
}

function createDecisionMap(
  extraction: InquiryExtraction,
  decisions: readonly InquiryReviewDecision[],
): ReadonlyMap<string, InquiryReviewDecision> {
  const reviewFields =
    new Set(
      getReviewIssues(extraction).map(
        (issue) => issue.field,
      ),
    );

  const decisionsByField =
    new Map<
      string,
      InquiryReviewDecision
    >();

  for (const decision of decisions) {
    if (!reviewFields.has(decision.field)) {
      throw new InquiryResolutionError(
        `Persisted decision for ${decision.field} is stale or does not belong to the current extraction.`,
      );
    }

    if (
      decisionsByField.has(
        decision.field,
      )
    ) {
      throw new InquiryResolutionError(
        `Duplicate persisted decision for ${decision.field}.`,
      );
    }

    validateDecision(
      extraction,
      decision,
    );

    decisionsByField.set(
      decision.field,
      decision,
    );
  }

  return decisionsByField;
}

function resolveNumberField(
  field: string,
  candidate: ReviewableField<number | null>,
  decisions:
    ReadonlyMap<string, InquiryReviewDecision>,
): number | null {
  if (!candidate.requiresReview) {
    return candidate.value;
  }

  const decision =
    decisions.get(field);

  if (!decision) {
    throw new InquiryResolutionError(
      `Missing human decision for ${field}.`,
    );
  }

  if (
    typeof decision.resolvedValue !==
    "number"
  ) {
    throw new InquiryResolutionError(
      `Resolved value for ${field} must be numeric.`,
    );
  }

  return decision.resolvedValue;
}

function resolveStringField(
  field: string,
  candidate: ReviewableField<string | null>,
  decisions:
    ReadonlyMap<string, InquiryReviewDecision>,
): string | null {
  if (!candidate.requiresReview) {
    return candidate.value;
  }

  const decision =
    decisions.get(field);

  if (!decision) {
    throw new InquiryResolutionError(
      `Missing human decision for ${field}.`,
    );
  }

  if (
    typeof decision.resolvedValue !==
    "string"
  ) {
    throw new InquiryResolutionError(
      `Resolved value for ${field} must be text.`,
    );
  }

  return decision.resolvedValue;
}

function resolveRequirement(
  field: string,
  candidate: ReviewableField<string>,
  decisions:
    ReadonlyMap<string, InquiryReviewDecision>,
): string {
  if (!candidate.requiresReview) {
    return candidate.value;
  }

  const decision =
    decisions.get(field);

  if (!decision) {
    throw new InquiryResolutionError(
      `Missing human decision for ${field}.`,
    );
  }

  if (
    typeof decision.resolvedValue !==
    "string"
  ) {
    throw new InquiryResolutionError(
      `Resolved value for ${field} must be text.`,
    );
  }

  return decision.resolvedValue;
}

export function resolveReviewedInquiry(
  extraction: InquiryExtraction,
  decisions: readonly InquiryReviewDecision[],
): ResolvedInquiry | null {
  const reviewIssues =
    getReviewIssues(extraction);

  const decisionsByField =
    createDecisionMap(
      extraction,
      decisions,
    );

  const hasUnresolvedIssue =
    reviewIssues.some(
      (issue) =>
        !decisionsByField.has(
          issue.field,
        ),
    );

  if (hasUnresolvedIssue) {
    return null;
  }

  return {
    guests: resolveNumberField(
      "guests",
      extraction.guests,
      decisionsByField,
    ),
    rooms: resolveNumberField(
      "rooms",
      extraction.rooms,
      decisionsByField,
    ),
    startDate: resolveStringField(
      "startDate",
      extraction.startDate,
      decisionsByField,
    ),
    endDate: resolveStringField(
      "endDate",
      extraction.endDate,
      decisionsByField,
    ),
    budgetCents: resolveNumberField(
      "budgetCents",
      extraction.budgetCents,
      decisionsByField,
    ),
    requirements:
      extraction.requirements.map(
        (
          requirement,
          index,
        ) =>
          resolveRequirement(
            `requirements.${index}`,
            requirement,
            decisionsByField,
          ),
      ),
  };
}
