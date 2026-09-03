import { proposalDraftIdSchema } from "@proposal-agent/contracts";
import type { Currency, PricingBasis, PricingResult } from "@proposal-agent/domain";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPersistedProposalDraftUseCase } from "@/lib/server/proposals";

interface ProposalDraftPageProps {
  readonly params: Promise<{
    readonly id: string;
  }>;
}

export const dynamic = "force-dynamic";

function formatMoney(amountMinor: number, currency: Currency): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

function formatDateTime(value: Date): string {
  return value.toISOString().slice(0, 19).replace("T", " ") + " UTC";
}

function formatPricingBasis(basis: PricingBasis): string {
  switch (basis) {
    case "per_person":
      return "per person";

    case "per_room":
      return "per room";

    case "per_room_night":
      return "per room-night";

    case "per_day":
      return "per day";

    case "flat":
      return "flat";

    default:
      return basis;
  }
}

function BudgetSummary({ pricing }: { readonly pricing: PricingResult }) {
  const difference = pricing.differenceFromBudgetMinor;

  if (pricing.budgetMinor === null || difference === null) {
    return <p className="text-sm text-zinc-600">No customer budget was captured.</p>;
  }

  if (difference > 0) {
    return (
      <p data-testid="proposal-budget-status" className="text-sm font-semibold text-amber-700">
        {formatMoney(difference, pricing.currency)} over customer budget.
      </p>
    );
  }

  if (difference < 0) {
    return (
      <p data-testid="proposal-budget-status" className="text-sm font-semibold text-emerald-700">
        {formatMoney(Math.abs(difference), pricing.currency)} under customer budget.
      </p>
    );
  }

  return (
    <p data-testid="proposal-budget-status" className="text-sm font-semibold text-emerald-700">
      Exactly on customer budget.
    </p>
  );
}

function displayNumber(value: number | null): string {
  return value === null ? "Not provided" : value.toLocaleString("en-US");
}

function displayDate(value: string | null): string {
  return value ?? "Not provided";
}

export default async function ProposalDraftPage({ params }: ProposalDraftPageProps) {
  const { id } = await params;

  const parsedId = proposalDraftIdSchema.safeParse(id);

  if (!parsedId.success) {
    notFound();
  }

  const draft = await getPersistedProposalDraftUseCase(parsedId.data);

  if (!draft) {
    notFound();
  }

  return (
    <main data-testid="proposal-draft" className="min-h-screen bg-zinc-50 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/inquiries/${draft.inquiryId}`}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-950"
          >
            ← Back to inquiry
          </Link>

          <Link href="/" className="text-sm font-medium text-zinc-600 hover:text-zinc-950">
            Proposal Agent
          </Link>
        </div>

        <div className="mt-10 space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Persisted proposal snapshot
                </p>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                  Review-ready proposal draft
                </h1>

                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  This page is rendered from the persisted proposal snapshot. It is not recalculated
                  from the current catalog.
                </p>
              </div>

              <span
                data-testid="proposal-status"
                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800"
              >
                Draft · not approved · not sent
              </span>
            </div>

            <dl className="mt-7 grid gap-5 border-y border-zinc-200 py-5 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Proposal ID
                </dt>

                <dd className="mt-1 break-all text-sm font-medium text-zinc-900">{draft.id}</dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Created
                </dt>

                <dd className="mt-1 text-sm font-medium text-zinc-900">
                  {formatDateTime(draft.createdAt)}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Catalog snapshot
                </dt>

                <dd
                  data-testid="proposal-catalog-version"
                  className="mt-1 text-sm font-medium text-zinc-900"
                >
                  {draft.catalogVersion}
                </dd>
              </div>
            </dl>

            <p className="mt-5 text-xs leading-5 text-zinc-500">
              Source inquiry{" "}
              <span data-testid="proposal-inquiry-id" className="font-mono text-zinc-700">
                {draft.inquiryId}
              </span>
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Human-reviewed input snapshot
            </p>

            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">
              Resolved inquiry
            </h2>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-zinc-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Guests
                </dt>

                <dd
                  data-testid="proposal-guests"
                  className="mt-2 text-lg font-semibold text-zinc-950"
                >
                  {displayNumber(draft.resolvedInquiry.guests)}
                </dd>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Rooms
                </dt>

                <dd
                  data-testid="proposal-rooms"
                  className="mt-2 text-lg font-semibold text-zinc-950"
                >
                  {displayNumber(draft.resolvedInquiry.rooms)}
                </dd>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Start date
                </dt>

                <dd
                  data-testid="proposal-start-date"
                  className="mt-2 text-lg font-semibold text-zinc-950"
                >
                  {displayDate(draft.resolvedInquiry.startDate)}
                </dd>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  End date
                </dt>

                <dd
                  data-testid="proposal-end-date"
                  className="mt-2 text-lg font-semibold text-zinc-950"
                >
                  {displayDate(draft.resolvedInquiry.endDate)}
                </dd>
              </div>
            </dl>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Customer requirements
              </p>

              {draft.resolvedInquiry.requirements.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {draft.resolvedInquiry.requirements.map((requirement, index) => (
                    <li
                      key={`${index}:${requirement}`}
                      className="rounded-xl border border-zinc-200 px-4 py-3 text-sm leading-6 text-zinc-700"
                    >
                      {requirement}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-zinc-500">No requirements captured.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Authoritative snapshot
                </p>

                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">
                  Proposal pricing
                </h2>
              </div>

              <span className="rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700">
                {draft.pricing.currency}
              </span>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                    <th className="pb-3 pr-4 font-semibold">Item</th>

                    <th className="pb-3 pr-4 font-semibold">Quantity</th>

                    <th className="pb-3 pr-4 font-semibold">Unit price</th>

                    <th className="pb-3 text-right font-semibold">Line total</th>
                  </tr>
                </thead>

                <tbody>
                  {draft.pricing.lines.map((line) => (
                    <tr key={line.catalogItemId} className="border-b border-zinc-200 last:border-0">
                      <td className="py-4 pr-4">
                        <p className="font-semibold text-zinc-950">{line.name}</p>

                        <p className="mt-1 text-xs text-zinc-500">
                          {formatPricingBasis(line.pricingBasis)}
                        </p>
                      </td>

                      <td className="py-4 pr-4 font-medium text-zinc-800">{line.quantity}</td>

                      <td className="py-4 pr-4 text-zinc-700">
                        {formatMoney(line.unitPriceMinor, draft.pricing.currency)}
                      </td>

                      <td className="py-4 text-right font-semibold text-zinc-950">
                        {formatMoney(line.lineTotalMinor, draft.pricing.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid gap-5 border-t border-zinc-200 pt-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Customer budget
                </p>

                <p className="mt-2 text-lg font-semibold text-zinc-900">
                  {draft.pricing.budgetMinor === null
                    ? "Not provided"
                    : formatMoney(draft.pricing.budgetMinor, draft.pricing.currency)}
                </p>

                <div className="mt-2">
                  <BudgetSummary pricing={draft.pricing} />
                </div>
              </div>

              <div className="sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Proposal total
                </p>

                <p
                  data-testid="proposal-total"
                  className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950"
                >
                  {formatMoney(draft.pricing.totalMinor, draft.pricing.currency)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
            <p className="text-sm font-semibold text-emerald-950">Authority boundary preserved</p>

            <p className="mt-2 text-sm leading-6 text-emerald-800">
              AI interpretation is upstream. Human review resolves uncertain facts. Deterministic
              domain code owns quantities and totals. This persisted draft stores that result as a
              historical snapshot.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
