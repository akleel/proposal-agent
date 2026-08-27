"use client";

import type {
  CatalogSelection,
} from "@proposal-agent/domain";
import {
  useActionState,
} from "react";
import {
  useFormStatus,
} from "react-dom";

import {
  createProposalDraftAction,
} from "./proposal-actions";
import {
  initialProposalDraftActionState,
} from "./proposal-draft-types";

interface CreateProposalDraftFormProps {
  readonly inquiryId: string;
  readonly selections:
    readonly CatalogSelection[];
}

function CreateDraftSubmitButton() {
  const {
    pending,
  } = useFormStatus();

  return (
    <button
      type="submit"
      data-testid="create-proposal-draft"
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending
        ? "Creating draft..."
        : "Create review-ready draft"}
    </button>
  );
}

export function CreateProposalDraftForm({
  inquiryId,
  selections,
}: CreateProposalDraftFormProps) {
  const [
    state,
    formAction,
  ] = useActionState(
    createProposalDraftAction,
    initialProposalDraftActionState,
  );

  return (
    <div className="mt-6 border-t border-zinc-200 pt-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-zinc-950">
            Persist this pricing as a proposal draft
          </p>

          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Draft creation recalculates
            pricing server-side from the
            reviewed inquiry and authoritative
            catalog, then stores the resulting
            snapshot. The draft is not approved
            and is not sent.
          </p>
        </div>

        <form
          action={formAction}
          className="shrink-0"
        >
          <input
            type="hidden"
            name="inquiryId"
            value={inquiryId}
          />

          {selections.map(
            (selection) => (
              <span
                key={
                  selection.catalogItemId
                }
              >
                <input
                  type="hidden"
                  name="catalogItemId"
                  value={
                    selection.catalogItemId
                  }
                />

                <input
                  type="hidden"
                  name={`occurrences:${selection.catalogItemId}`}
                  value={
                    selection.occurrences
                  }
                />
              </span>
            ),
          )}

          <CreateDraftSubmitButton />
        </form>
      </div>

      {state.status === "error" ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
