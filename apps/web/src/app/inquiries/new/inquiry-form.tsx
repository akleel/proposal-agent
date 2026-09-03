"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { createInquiryAction } from "./actions";

interface ActionState {
  readonly errors: {
    readonly rawText?: readonly string[];
  };
  readonly message: string;
}

const initialState: ActionState = {
  errors: {},
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Saving…" : "Create inquiry"}
    </button>
  );
}

export function InquiryForm() {
  const [state, formAction] = useActionState(createInquiryAction, initialState);

  const errors = state.errors.rawText ?? [];

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="rawText" className="block text-sm font-medium text-zinc-900">
          Customer inquiry
        </label>

        <textarea
          id="rawText"
          name="rawText"
          rows={12}
          required
          minLength={10}
          maxLength={20000}
          aria-invalid={errors.length > 0}
          aria-describedby={errors.length > 0 ? "rawText-errors" : "rawText-help"}
          placeholder="Hi, we're planning a company offsite for 65 people…"
          className="w-full resize-y rounded-xl border border-zinc-300 bg-white p-4 text-sm leading-6 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
        />

        <p id="rawText-help" className="text-sm text-zinc-500">
          Paste the original customer request. After saving, you can run guarded AI extraction and
          review the evidence before downstream use.
        </p>

        {errors.length > 0 ? (
          <ul id="rawText-errors" className="space-y-1 text-sm text-red-700">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {state.message ? (
        <p role="status" className="text-sm text-zinc-700">
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
