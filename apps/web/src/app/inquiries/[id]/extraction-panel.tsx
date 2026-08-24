"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { extractInquiryAction } from "./actions";
import {
  initialExtractInquiryActionState,
} from "./types";

interface ExtractionPanelProps {
  readonly inquiryId: string;
}

interface ReviewFieldProps {
  readonly label: string;
  readonly value: string;
  readonly confidence: number;
  readonly source: string | null;
  readonly requiresReview: boolean;
}

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

function formatReviewIssueField(field: string): string {
  const labels: Readonly<Record<string, string>> = {
    guests: "Guests",
    rooms: "Rooms",
    startDate: "Start date",
    endDate: "End date",
    budgetCents: "Budget",
  };

  const label = labels[field];

  if (label) {
    return label;
  }

  const requirementMatch = /^requirements\.(\d+)$/.exec(field);

  if (requirementMatch) {
    return `Requirement ${Number(requirementMatch[1]) + 1}`;
  }

  return field;
}

function formatNullableValue(
  value: string | number | null,
): string {
  if (value === null) {
    return "Not resolved";
  }

  if (typeof value === "number") {
    return value.toLocaleString("en-US");
  }

  return value;
}

function ReviewBadge({
  requiresReview,
}: {
  readonly requiresReview: boolean;
}) {
  if (requiresReview) {
    return (
      <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
        Review required
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
      No review flag
    </span>
  );
}

function ReviewField({
  label,
  value,
  confidence,
  source,
  requiresReview,
}: ReviewFieldProps) {
  return (
    <article
      className={`rounded-2xl border p-5 ${
        requiresReview
          ? "border-amber-200 bg-amber-50/40"
          : "border-zinc-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {label}
          </p>

          <p className="mt-2 text-lg font-semibold text-zinc-950">
            {value}
          </p>
        </div>

        <ReviewBadge requiresReview={requiresReview} />
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Confidence
          </dt>
          <dd className="mt-1 text-sm font-medium text-zinc-900">
            {formatConfidence(confidence)}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Source evidence
          </dt>
          <dd className="mt-1 text-sm leading-6 text-zinc-700">
            {source ?? "No supporting source"}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function ExtractButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Extracting…" : "Run AI extraction"}
    </button>
  );
}

export function ExtractionPanel({
  inquiryId,
}: ExtractionPanelProps) {
  const [state, formAction] = useActionState(
    extractInquiryAction,
    initialExtractInquiryActionState,
  );

  const extraction = state.result?.extraction ?? null;
  const reviewIssues = state.result?.reviewIssues ?? [];

  return (
    <section
      aria-labelledby="ai-extraction-heading"
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
            AI interpretation
          </p>

          <h2
            id="ai-extraction-heading"
            className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950"
          >
            Extract proposal requirements
          </h2>

          <p className="mt-3 text-sm leading-6 text-zinc-600">
            The model interprets the customer inquiry. Evidence,
            confidence and human-review status remain visible so
            probabilistic output is not mistaken for business
            authority.
          </p>
        </div>

        <form action={formAction}>
          <input
            type="hidden"
            name="inquiryId"
            value={inquiryId}
          />

          <ExtractButton />
        </form>
      </div>

      {state.message ? (
        <div
          role="status"
          className={`mt-6 rounded-xl border px-4 py-3 text-sm leading-6 ${
            state.status === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : state.status === "success"
                ? "border-zinc-200 bg-zinc-50 text-zinc-700"
                : "border-zinc-200 bg-zinc-50 text-zinc-700"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      {extraction ? (
        <div className="mt-8 space-y-8">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-zinc-950">
                Structured fields
              </h3>

              <span
                className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  reviewIssues.length > 0
                    ? "border-amber-300 bg-amber-50 text-amber-800"
                    : "border-emerald-300 bg-emerald-50 text-emerald-800"
                }`}
              >
                {reviewIssues.length > 0
                  ? `${reviewIssues.length} review flag${
                      reviewIssues.length === 1 ? "" : "s"
                    }`
                  : "No review flags"}
              </span>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <ReviewField
                label="Guests"
                value={formatNullableValue(
                  extraction.guests.value,
                )}
                confidence={extraction.guests.confidence}
                source={extraction.guests.source}
                requiresReview={
                  extraction.guests.requiresReview
                }
              />

              <ReviewField
                label="Rooms"
                value={formatNullableValue(
                  extraction.rooms.value,
                )}
                confidence={extraction.rooms.confidence}
                source={extraction.rooms.source}
                requiresReview={
                  extraction.rooms.requiresReview
                }
              />

              <ReviewField
                label="Start date"
                value={formatNullableValue(
                  extraction.startDate.value,
                )}
                confidence={extraction.startDate.confidence}
                source={extraction.startDate.source}
                requiresReview={
                  extraction.startDate.requiresReview
                }
              />

              <ReviewField
                label="End date"
                value={formatNullableValue(
                  extraction.endDate.value,
                )}
                confidence={extraction.endDate.confidence}
                source={extraction.endDate.source}
                requiresReview={
                  extraction.endDate.requiresReview
                }
              />

              <ReviewField
                label="Budget (minor units)"
                value={formatNullableValue(
                  extraction.budgetCents.value,
                )}
                confidence={
                  extraction.budgetCents.confidence
                }
                source={extraction.budgetCents.source}
                requiresReview={
                  extraction.budgetCents.requiresReview
                }
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-zinc-950">
              Requirements
            </h3>

            {extraction.requirements.length > 0 ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {extraction.requirements.map(
                  (requirement, index) => (
                    <ReviewField
                      key={`${index}-${requirement.value}`}
                      label={`Requirement ${index + 1}`}
                      value={requirement.value}
                      confidence={requirement.confidence}
                      source={requirement.source}
                      requiresReview={
                        requirement.requiresReview
                      }
                    />
                  ),
                )}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                No explicit customer requirements were extracted.
              </p>
            )}
          </div>

          {reviewIssues.length > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
              <h3 className="font-semibold text-amber-950">
                Human review queue
              </h3>

              <p className="mt-2 text-sm leading-6 text-amber-900">
                These fields failed at least one deterministic
                review rule. They must not be treated as approved
                proposal data.
              </p>

              <ul className="mt-4 space-y-3">
                {reviewIssues.map((issue) => (
                  <li
                    key={formatReviewIssueField(issue.field)}
                    className="rounded-xl border border-amber-200 bg-white/70 p-4"
                  >
                    <p className="text-sm font-semibold text-zinc-950">
                      {formatReviewIssueField(issue.field)}
                    </p>

                    <p className="mt-1 text-sm text-zinc-600">
                      Confidence:{" "}
                      {formatConfidence(issue.confidence)}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-zinc-700">
                      Evidence:{" "}
                      {issue.source ??
                        "No supporting source"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
              <h3 className="font-semibold text-emerald-950">
                No deterministic review flags
              </h3>

              <p className="mt-2 text-sm leading-6 text-emerald-900">
                This means the extraction passed the current
                evidence and confidence checks. It does not approve,
                price, or send a proposal.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6">
          <p className="text-sm font-medium text-zinc-800">
            No extraction has been run in this page session.
          </p>

          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Running extraction calls the configured AI provider once.
            Reloading the page does not automatically call the model.
          </p>
        </div>
      )}
    </section>
  );
}
