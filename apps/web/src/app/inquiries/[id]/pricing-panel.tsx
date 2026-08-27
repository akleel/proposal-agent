"use client";

import type {
  PricingCatalog,
} from "@proposal-agent/application";
import type {
  CatalogSelection,
  PricingBasis,
  PricingResult,
  ResolvedInquiry,
} from "@proposal-agent/domain";
import {
  useActionState,
} from "react";
import {
  useFormStatus,
} from "react-dom";

import {
  calculateInquiryPricingAction,
} from "./actions";
import {
  CreateProposalDraftForm,
} from "./proposal-draft-form";
import {
  initialPricingActionState,
} from "./pricing-types";

interface PricingPanelProps {
  readonly inquiryId: string;
  readonly catalog:
    PricingCatalog;
  readonly resolvedInquiry:
    ResolvedInquiry | null;
}

function formatMoney(
  minor: number,
  currency: string,
): string {
  return new Intl.NumberFormat(
    "en-SE",
    {
      style: "currency",
      currency,
    },
  ).format(
    minor / 100,
  );
}

function formatPricingBasis(
  basis: PricingBasis,
): string {
  switch (basis) {
    case "per_person":
      return "per person";

    case "per_room":
      return "per room";

    case "per_room_night":
      return "per room / night";

    case "per_day":
      return "per day";

    case "flat":
      return "flat";
  }
}

function isRepeatable(
  basis: PricingBasis,
): boolean {
  return (
    basis === "per_person" ||
    basis === "per_day"
  );
}

function calculateNightCount(
  inquiry: ResolvedInquiry | null,
): number | null {
  if (
    !inquiry?.startDate ||
    !inquiry.endDate
  ) {
    return null;
  }

  const start =
    Date.parse(
      `${inquiry.startDate}T00:00:00Z`,
    );

  const end =
    Date.parse(
      `${inquiry.endDate}T00:00:00Z`,
    );

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start
  ) {
    return null;
  }

  return (
    (end - start) /
    (24 * 60 * 60 * 1000)
  );
}

function DerivedQuantityContext({
  basis,
  inquiry,
}: {
  readonly basis:
    PricingBasis;
  readonly inquiry:
    ResolvedInquiry | null;
}) {
  if (
    basis === "per_room_night"
  ) {
    const rooms =
      inquiry?.rooms ?? null;

    const nights =
      calculateNightCount(
        inquiry,
      );

    if (
      rooms !== null &&
      nights !== null
    ) {
      const quantity =
        rooms * nights;

      return (
        <div className="text-sm text-zinc-600 sm:text-right">
          <p>
            <span className="font-semibold text-zinc-900">
              {rooms}
            </span>{" "}
            rooms ×{" "}
            <span className="font-semibold text-zinc-900">
              {nights}
            </span>{" "}
            nights
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Calculated quantity:{" "}
            <span className="font-semibold text-zinc-700">
              {quantity} room-night
              {quantity === 1
                ? ""
                : "s"}
            </span>
          </p>
        </div>
      );
    }

    return (
      <p className="text-sm text-zinc-500 sm:text-right">
        Quantity derives from reviewed
        rooms and stay dates.
      </p>
    );
  }

  if (basis === "per_room") {
    const rooms =
      inquiry?.rooms ?? null;

    if (rooms !== null) {
      return (
        <div className="text-sm text-zinc-600 sm:text-right">
          <p>
            <span className="font-semibold text-zinc-900">
              {rooms}
            </span>{" "}
            room
            {rooms === 1 ? "" : "s"}
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Calculated quantity:{" "}
            <span className="font-semibold text-zinc-700">
              {rooms} room
              {rooms === 1
                ? ""
                : "s"}
            </span>
          </p>
        </div>
      );
    }

    return (
      <p className="text-sm text-zinc-500 sm:text-right">
        Quantity derives from reviewed
        room count.
      </p>
    );
  }

  if (basis === "flat") {
    return (
      <p className="text-sm font-medium text-zinc-600 sm:text-right">
        One flat charge
      </p>
    );
  }

  return null;
}

function PricingSubmitButton() {
  const {
    pending,
  } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending
        ? "Calculating…"
        : "Calculate pricing"}
    </button>
  );
}

function BudgetSummary({
  pricing,
}: {
  readonly pricing:
    PricingResult;
}) {
  if (
    pricing.budgetMinor === null ||
    pricing.differenceFromBudgetMinor ===
      null
  ) {
    return (
      <p
        data-testid="pricing-budget-status"
        className="text-sm font-medium text-zinc-700"
      >
        No customer budget is available
        for comparison.
      </p>
    );
  }

  const difference =
    pricing.differenceFromBudgetMinor;

  if (difference > 0) {
    return (
      <p
        data-testid="pricing-budget-status"
        className="text-sm font-semibold text-red-700"
      >
        {formatMoney(
          difference,
          pricing.currency,
        )}{" "}
        over customer budget.
      </p>
    );
  }

  if (difference < 0) {
    return (
      <p
        data-testid="pricing-budget-status"
        className="text-sm font-semibold text-emerald-700"
      >
        {formatMoney(
          Math.abs(difference),
          pricing.currency,
        )}{" "}
        under customer budget.
      </p>
    );
  }

  return (
    <p
      data-testid="pricing-budget-status"
      className="text-sm font-semibold text-emerald-700"
    >
      Exactly on customer budget.
    </p>
  );
}

function PricingResultView({
  inquiryId,
  pricing,
  selections,
}: {
  readonly inquiryId: string;
  readonly pricing:
    PricingResult;
  readonly selections:
    readonly CatalogSelection[];
}) {
  return (
    <section
      aria-labelledby="pricing-result-heading"
      className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Deterministic result
          </p>

          <h3
            id="pricing-result-heading"
            className="mt-2 text-xl font-semibold text-zinc-950"
          >
            Pricing breakdown
          </h3>
        </div>

        <span className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700">
          Catalog{" "}
          {pricing.catalogVersion}
        </span>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
              <th className="pb-3 pr-4 font-semibold">
                Item
              </th>
              <th className="pb-3 pr-4 font-semibold">
                Quantity
              </th>
              <th className="pb-3 pr-4 font-semibold">
                Unit price
              </th>
              <th className="pb-3 text-right font-semibold">
                Line total
              </th>
            </tr>
          </thead>

          <tbody>
            {pricing.lines.map(
              (line) => (
                <tr
                  key={
                    line.catalogItemId
                  }
                  className="border-b border-zinc-200 last:border-0"
                >
                  <td className="py-4 pr-4">
                    <p className="font-semibold text-zinc-950">
                      {line.name}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatPricingBasis(
                        line.pricingBasis,
                      )}
                    </p>
                  </td>

                  <td className="py-4 pr-4 font-medium text-zinc-800">
                    {line.quantity}
                  </td>

                  <td className="py-4 pr-4 text-zinc-700">
                    {formatMoney(
                      line.unitPriceMinor,
                      pricing.currency,
                    )}
                  </td>

                  <td className="py-4 text-right font-semibold text-zinc-950">
                    {formatMoney(
                      line.lineTotalMinor,
                      pricing.currency,
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-4 border-t border-zinc-200 pt-5 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Customer budget
          </p>

          <p className="mt-2 text-lg font-semibold text-zinc-900">
            {pricing.budgetMinor ===
            null
              ? "Not provided"
              : formatMoney(
                  pricing.budgetMinor,
                  pricing.currency,
                )}
          </p>

          <div className="mt-2">
            <BudgetSummary
              pricing={pricing}
            />
          </div>
        </div>

        <div className="sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Proposal total
          </p>

          <p
            data-testid="pricing-total"
            className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950"
          >
            {formatMoney(
              pricing.totalMinor,
              pricing.currency,
            )}
          </p>
        </div>
      </div>

      <p className="mt-6 border-t border-zinc-200 pt-4 text-xs leading-5 text-zinc-500">
        Quantities and totals were
        calculated by deterministic domain
        code from the reviewed inquiry and
        authoritative server-side catalog.
      </p>

      <CreateProposalDraftForm
        inquiryId={inquiryId}
        selections={selections}
      />
    </section>
  );
}

export function PricingPanel({
  inquiryId,
  catalog,
  resolvedInquiry,
}: PricingPanelProps) {
  const [
    state,
    formAction,
  ] = useActionState(
    calculateInquiryPricingAction,
    initialPricingActionState,
  );

  const activeItems =
    catalog.items.filter(
      (item) => item.active,
    );

  const enabled =
    resolvedInquiry !== null;

  const available =
    enabled &&
    activeItems.length > 0;

  return (
    <section
      data-testid="pricing-panel"
      aria-labelledby="pricing-heading"
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Authoritative pricing
        </p>

        <h2
          id="pricing-heading"
          className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950"
        >
          Build deterministic pricing
        </h2>

        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Select products explicitly.
          The browser submits only catalog
          identifiers and occurrences.
          Authoritative prices, quantities,
          totals, and budget comparison are
          calculated again on the server.
        </p>
      </div>

      {!enabled ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-950">
            Pricing is locked
          </p>

          <p className="mt-1 text-sm leading-6 text-amber-800">
            Complete extraction and any
            required human review to produce
            the deterministic ResolvedInquiry
            boundary first.
          </p>
        </div>
      ) : null}

      {enabled &&
      activeItems.length === 0 ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          No active catalog items are
          available.
        </div>
      ) : null}

      <form
        action={formAction}
        className="mt-7"
      >
        <input
          type="hidden"
          name="inquiryId"
          value={inquiryId}
        />

        <fieldset
          disabled={!available}
          className="space-y-4 disabled:opacity-60"
        >
          {activeItems.map(
            (item) => {
              const checkboxId =
                `catalog-${item.id}`;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-zinc-200 p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <input
                        id={checkboxId}
                        type="checkbox"
                        name="catalogItemId"
                        value={item.id}
                        className="mt-1 h-4 w-4 rounded border-zinc-300"
                      />

                      <label
                        htmlFor={
                          checkboxId
                        }
                        className="cursor-pointer"
                      >
                        <span className="block font-semibold text-zinc-950">
                          {item.name}
                        </span>

                        <span className="mt-1 block text-sm text-zinc-600">
                          {formatMoney(
                            item.unitPriceMinor,
                            item.currency,
                          )}{" "}
                          {formatPricingBasis(
                            item.pricingBasis,
                          )}
                        </span>
                      </label>
                    </div>

                    {isRepeatable(
                      item.pricingBasis,
                    ) ? (
                      <label className="block sm:w-36">
                        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Occurrences
                        </span>

                        <input
                          type="number"
                          name={`occurrences:${item.id}`}
                          defaultValue={1}
                          min={1}
                          max={1000}
                          step={1}
                          inputMode="numeric"
                          className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                        />
                      </label>
                    ) : (
                      <>
                        <input
                          type="hidden"
                          name={`occurrences:${item.id}`}
                          value="1"
                        />

                        <DerivedQuantityContext
                          basis={
                            item.pricingBasis
                          }
                          inquiry={
                            resolvedInquiry
                          }
                        />
                      </>
                    )}
                  </div>
                </div>
              );
            },
          )}

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <PricingSubmitButton />

            <p className="text-xs leading-5 text-zinc-500">
              Demo catalog{" "}
              {catalog.version}. Prices are
              fictional demo configuration,
              not market claims.
            </p>
          </div>
        </fieldset>
      </form>

      {state.message ? (
        <div
          role="status"
          className={`mt-5 rounded-xl border px-4 py-3 text-sm leading-6 ${
            state.status === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      {state.pricing &&
      state.selections ? (
        <PricingResultView
          inquiryId={inquiryId}
          pricing={state.pricing}
          selections={
            state.selections
          }
        />
      ) : null}
    </section>
  );
}
