"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { inquiryReviewWorkflowAction } from "./actions";
import {
  createInitialInquiryReviewActionState,
  type InquiryExtractionResult,
  type InquiryReviewDecisionResult,
} from "./types";

interface ExtractionPanelProps {
  readonly inquiryId: string;
  readonly initialResult: InquiryExtractionResult | null;
}

interface ReviewFieldProps {
  readonly label: string;
  readonly value: string;
  readonly confidence: number;
  readonly source: string | null;
  readonly requiresReview: boolean;
}

function formatDisplayDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 19).replace("T", " ") + " UTC";
}

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

function formatNullableValue(value: string | number | null): string {
  if (value === null) {
    return "Not resolved";
  }

  if (typeof value === "number") {
    return value.toLocaleString("en-US");
  }

  return value;
}

function formatReviewIssueField(field: string): string {
  const labels: Readonly<Record<string, string>> = {
    guests: "Guests",
    rooms: "Rooms",
    startDate: "Start date",
    endDate: "End date",
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

function getCandidateValue(result: InquiryExtractionResult, field: string): string | number | null {
  switch (field) {
    case "guests":
      return result.extraction.guests.value;
    case "rooms":
      return result.extraction.rooms.value;
    case "startDate":
      return result.extraction.startDate.value;
    case "endDate":
      return result.extraction.endDate.value;
    case "budgetCents":
      return result.extraction.budgetCents.value;
    default:
      break;
  }

  const requirementMatch = /^requirements\.(\d+)$/.exec(field);

  if (!requirementMatch) {
    return null;
  }

  return result.extraction.requirements[Number(requirementMatch[1])]?.value ?? null;
}

function getCorrectionInputType(field: string): "date" | "number" | "text" {
  if (field === "startDate" || field === "endDate") {
    return "date";
  }

  if (field === "guests" || field === "rooms" || field === "budgetCents") {
    return "number";
  }

  return "text";
}

function ReviewBadge({ requiresReview }: { readonly requiresReview: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
        requiresReview
          ? "border-amber-300 bg-amber-50 text-amber-800"
          : "border-emerald-300 bg-emerald-50 text-emerald-800"
      }`}
    >
      {requiresReview ? "Review required" : "No review flag"}
    </span>
  );
}

function ReviewField({ label, value, confidence, source, requiresReview }: ReviewFieldProps) {
  return (
    <article
      className={`rounded-2xl border p-5 ${
        requiresReview ? "border-amber-200 bg-amber-50/40" : "border-zinc-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>

          <p className="mt-2 text-lg font-semibold text-zinc-950">{value}</p>
        </div>

        <ReviewBadge requiresReview={requiresReview} />
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Confidence</dt>
          <dd className="mt-1 text-sm font-medium text-zinc-900">{formatConfidence(confidence)}</dd>
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

function ActionButton({
  idleLabel,
  pendingLabel,
  secondary = false,
}: {
  readonly idleLabel: string;
  readonly pendingLabel: string;
  readonly secondary?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        secondary
          ? "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
          : "bg-black text-white hover:bg-zinc-800"
      }`}
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

function DecisionBadge({ decision }: { readonly decision: InquiryReviewDecisionResult }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
        Human decision saved
      </p>

      <p className="mt-2 text-sm font-semibold text-emerald-950">
        {decision.kind === "accepted" ? "Accepted AI value" : "Corrected value"}
      </p>

      <p className="mt-1 break-words text-sm text-emerald-900">
        Resolved value: {formatNullableValue(decision.resolvedValue)}
      </p>

      <p className="mt-1 text-xs text-emerald-700">
        Reviewed {formatDisplayDateTime(decision.reviewedAt)}
      </p>
    </div>
  );
}

function ResolvedInquiryPanel({
  inquiry,
}: {
  readonly inquiry: NonNullable<InquiryExtractionResult["resolvedInquiry"]>;
}) {
  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
        Deterministic downstream input
      </p>

      <h3 className="mt-2 text-lg font-semibold text-emerald-950">Resolved inquiry ready</h3>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-900">
        Application and domain code derived this state from the persisted extraction snapshot and
        any required human decisions. The AI model cannot write this downstream input directly.
      </p>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Guests</dt>
          <dd className="mt-1 font-medium text-emerald-950">
            {formatNullableValue(inquiry.guests)}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Rooms</dt>
          <dd className="mt-1 font-medium text-emerald-950">
            {formatNullableValue(inquiry.rooms)}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Start date
          </dt>
          <dd className="mt-1 font-medium text-emerald-950">
            {formatNullableValue(inquiry.startDate)}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            End date
          </dt>
          <dd className="mt-1 font-medium text-emerald-950">
            {formatNullableValue(inquiry.endDate)}
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Resolved requirements
        </h4>

        {inquiry.requirements.length > 0 ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-950">
            {inquiry.requirements.map((requirement, index) => (
              <li key={`${index}-${requirement}`}>{requirement}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-emerald-900">No explicit requirements.</p>
        )}
      </div>

      <p className="mt-5 border-t border-emerald-200 pt-4 text-sm font-medium text-emerald-950">
        Deterministic pricing below consumes this reviewed object instead of raw AI output.
      </p>
    </section>
  );
}

export function ExtractionPanel({ inquiryId, initialResult }: ExtractionPanelProps) {
  const [state, formAction] = useActionState(
    inquiryReviewWorkflowAction,
    createInitialInquiryReviewActionState(initialResult),
  );

  const result = state.result;

  const decisionsByField = new Map(
    result?.decisions.map((decision) => [decision.field, decision]) ?? [],
  );

  const unresolvedCount = result?.unresolvedReviewIssues.length ?? 0;

  const reviewCount = result?.reviewIssues.length ?? 0;

  const resolvedCount = reviewCount - unresolvedCount;

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
            Extract and review proposal requirements
          </h2>

          <p className="mt-3 text-sm leading-6 text-zinc-600">
            AI interpretation is persisted as a snapshot. Human decisions are stored separately and
            remain visible after reload.
          </p>
        </div>

        <form action={formAction}>
          <input type="hidden" name="operation" value="extract" />
          <input type="hidden" name="inquiryId" value={inquiryId} />

          <ActionButton
            idleLabel={result ? "Re-run AI extraction" : "Run AI extraction"}
            pendingLabel="Extracting…"
          />
        </form>
      </div>

      {result ? (
        <p className="mt-4 text-xs leading-5 text-zinc-500">
          Extraction snapshot saved {formatDisplayDateTime(result.extractedAt)}. Re-running
          extraction replaces this snapshot and clears its previous human review decisions.
        </p>
      ) : null}

      {state.message ? (
        <div
          role="status"
          className={`mt-6 rounded-xl border px-4 py-3 text-sm leading-6 ${
            state.status === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-zinc-200 bg-zinc-50 text-zinc-700"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      {result ? (
        <div className="mt-8 space-y-8">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-zinc-950">Structured fields</h3>

              <span
                className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  unresolvedCount > 0
                    ? "border-amber-300 bg-amber-50 text-amber-800"
                    : "border-emerald-300 bg-emerald-50 text-emerald-800"
                }`}
              >
                {reviewCount === 0
                  ? "No review flags"
                  : unresolvedCount === 0
                    ? `${resolvedCount} review flag${resolvedCount === 1 ? "" : "s"} resolved`
                    : `${unresolvedCount} unresolved of ${reviewCount}`}
              </span>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <ReviewField
                label="Guests"
                value={formatNullableValue(result.extraction.guests.value)}
                confidence={result.extraction.guests.confidence}
                source={result.extraction.guests.source}
                requiresReview={result.extraction.guests.requiresReview}
              />

              <ReviewField
                label="Rooms"
                value={formatNullableValue(result.extraction.rooms.value)}
                confidence={result.extraction.rooms.confidence}
                source={result.extraction.rooms.source}
                requiresReview={result.extraction.rooms.requiresReview}
              />

              <ReviewField
                label="Start date"
                value={formatNullableValue(result.extraction.startDate.value)}
                confidence={result.extraction.startDate.confidence}
                source={result.extraction.startDate.source}
                requiresReview={result.extraction.startDate.requiresReview}
              />

              <ReviewField
                label="End date"
                value={formatNullableValue(result.extraction.endDate.value)}
                confidence={result.extraction.endDate.confidence}
                source={result.extraction.endDate.source}
                requiresReview={result.extraction.endDate.requiresReview}
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-zinc-950">Requirements</h3>

            {result.extraction.requirements.length > 0 ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {result.extraction.requirements.map((requirement, index) => (
                  <ReviewField
                    key={`${index}-${requirement.value}`}
                    label={`Requirement ${index + 1}`}
                    value={requirement.value}
                    confidence={requirement.confidence}
                    source={requirement.source}
                    requiresReview={requirement.requiresReview}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                No explicit customer requirements were extracted.
              </p>
            )}
          </div>

          {reviewCount > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-amber-950">Human review queue</h3>

                  <p className="mt-2 text-sm leading-6 text-amber-900">
                    Human decisions resolve deterministic review flags. They do not approve, price,
                    or send a proposal.
                  </p>
                </div>
              </div>

              <ul className="mt-5 space-y-5">
                {result.reviewIssues.map((issue) => {
                  const decision = decisionsByField.get(issue.field);

                  const candidate = getCandidateValue(result, issue.field);

                  const inputType = getCorrectionInputType(issue.field);

                  const numericMinimum =
                    issue.field === "guests" ? 1 : inputType === "number" ? 0 : undefined;

                  return (
                    <li
                      key={issue.field}
                      className="rounded-2xl border border-amber-200 bg-white p-5"
                    >
                      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
                        <div>
                          <p className="text-sm font-semibold text-zinc-950">
                            {formatReviewIssueField(issue.field)}
                          </p>

                          <p className="mt-2 text-sm text-zinc-600">
                            AI candidate:{" "}
                            <span className="font-medium text-zinc-900">
                              {formatNullableValue(candidate)}
                            </span>
                          </p>

                          <p className="mt-1 text-sm text-zinc-600">
                            Confidence: {formatConfidence(issue.confidence)}
                          </p>

                          <p className="mt-1 text-sm leading-6 text-zinc-700">
                            Evidence: {issue.source ?? "No supporting source"}
                          </p>
                        </div>

                        <div className="space-y-4">
                          {decision ? (
                            <DecisionBadge decision={decision} />
                          ) : (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                              <p className="text-sm font-semibold text-amber-950">Unresolved</p>
                              <p className="mt-1 text-sm text-amber-800">
                                A human decision is still required.
                              </p>
                            </div>
                          )}

                          {candidate !== null ? (
                            <form action={formAction}>
                              <input type="hidden" name="operation" value="review" />
                              <input type="hidden" name="inquiryId" value={inquiryId} />
                              <input type="hidden" name="field" value={issue.field} />
                              <input type="hidden" name="kind" value="accepted" />

                              <ActionButton
                                idleLabel={
                                  decision?.kind === "accepted"
                                    ? "Re-accept AI value"
                                    : "Accept AI value"
                                }
                                pendingLabel="Saving…"
                                secondary
                              />
                            </form>
                          ) : null}

                          <form action={formAction} className="space-y-3">
                            <input type="hidden" name="operation" value="review" />
                            <input type="hidden" name="inquiryId" value={inquiryId} />
                            <input type="hidden" name="field" value={issue.field} />
                            <input type="hidden" name="kind" value="corrected" />

                            <label className="block">
                              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Corrected value
                              </span>

                              <input
                                name="correctedValue"
                                type={inputType}
                                min={numericMinimum}
                                step={inputType === "number" ? 1 : undefined}
                                required
                                defaultValue={
                                  decision?.kind === "corrected"
                                    ? String(decision.resolvedValue)
                                    : ""
                                }
                                placeholder="Enter corrected value"
                                className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                              />
                            </label>

                            <ActionButton
                              idleLabel={
                                decision?.kind === "corrected"
                                  ? "Update correction"
                                  : "Save correction"
                              }
                              pendingLabel="Saving…"
                            />
                          </form>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
              <h3 className="font-semibold text-emerald-950">No deterministic review flags</h3>

              <p className="mt-2 text-sm leading-6 text-emerald-900">
                The extraction passed the current evidence and confidence checks. This still does
                not approve, price, or send a proposal.
              </p>
            </div>
          )}

          {result.resolvedInquiry ? (
            <ResolvedInquiryPanel inquiry={result.resolvedInquiry} />
          ) : null}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6">
          <p className="text-sm font-medium text-zinc-800">No persisted extraction exists yet.</p>

          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Run AI extraction once. The resulting snapshot and subsequent human review decisions
            will persist across page reloads.
          </p>
        </div>
      )}
    </section>
  );
}
