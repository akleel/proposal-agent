"use client";

import type { ResolvedInquiry } from "@proposal-agent/domain";
import { useMemo, useState } from "react";

import type {
  ProposalesCatalog,
  ProposalesCatalogProduct,
  ProposalesQuantityMode,
} from "@/lib/server/proposales";

interface ProposalesBuilderProps {
  readonly inquiryId: string;
  readonly inquiry: ResolvedInquiry;
  readonly catalog: ProposalesCatalog;
  readonly unmatchedRequirements: readonly string[];
}

interface SelectedProductState {
  readonly selected: boolean;
  readonly amount: number;
}

type BuilderState =
  | {
      readonly status: "idle";
    }
  | {
      readonly status: "pending";
    }
  | {
      readonly status: "success";
      readonly url: string;
      readonly currency: string;
      readonly valueWithTaxMinor: number | null;
      readonly valueWithoutTaxMinor: number | null;
    }
  | {
      readonly status: "error";
      readonly message: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function calculateNightCount(inquiry: ResolvedInquiry): number | null {
  if (!inquiry.startDate || !inquiry.endDate) {
    return null;
  }

  const start = Date.parse(`${inquiry.startDate}T00:00:00Z`);
  const end = Date.parse(`${inquiry.endDate}T00:00:00Z`);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }

  const nights = (end - start) / (24 * 60 * 60 * 1000);

  return Number.isSafeInteger(nights) && nights > 0 ? nights : null;
}

function defaultAmount(mode: ProposalesQuantityMode, inquiry: ResolvedInquiry): number {
  switch (mode) {
    case "room_night":
    case "room_once":
      return inquiry.rooms ?? 1;

    case "person_night":
      return inquiry.guests ?? 1;

    case "day":
    case "unit":
      return 1;
  }
}

function inputLabel(mode: ProposalesQuantityMode): string {
  switch (mode) {
    case "room_night":
      return "Rooms";

    case "person_night":
      return "Guests";

    case "day":
      return "Days";

    case "room_once":
      return "Rooms";

    case "unit":
      return "Units";
  }
}

function quantityDescription(
  product: ProposalesCatalogProduct,
  amount: number,
  inquiry: ResolvedInquiry,
): string {
  const nights = calculateNightCount(inquiry);

  switch (product.quantityMode) {
    case "room_night":
      return nights === null
        ? "Requires reviewed stay dates."
        : `${amount} room${amount === 1 ? "" : "s"} × ${nights} night${nights === 1 ? "" : "s"} = ${amount * nights}`;

    case "person_night":
      return nights === null
        ? "Requires reviewed stay dates."
        : `${amount} guest${amount === 1 ? "" : "s"} × ${nights} occurrence${nights === 1 ? "" : "s"} = ${amount * nights}`;

    case "day":
      return `${amount} day${amount === 1 ? "" : "s"}`;

    case "room_once":
      return `${amount} room${amount === 1 ? "" : "s"}, once`;

    case "unit":
      return `${amount} unit${amount === 1 ? "" : "s"}`;
  }
}

function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(minor / 100);
}

function readSuccess(value: unknown): {
  readonly url: string;
  readonly currency: string;
  readonly valueWithTaxMinor: number | null;
  readonly valueWithoutTaxMinor: number | null;
} | null {
  if (!isRecord(value) || !isRecord(value.proposales)) {
    return null;
  }

  const { url, currency, valueWithTaxMinor, valueWithoutTaxMinor } = value.proposales;

  if (
    typeof url !== "string" ||
    url.length === 0 ||
    typeof currency !== "string" ||
    currency.length === 0 ||
    !(valueWithTaxMinor === null || typeof valueWithTaxMinor === "number") ||
    !(valueWithoutTaxMinor === null || typeof valueWithoutTaxMinor === "number")
  ) {
    return null;
  }

  return {
    url,
    currency,
    valueWithTaxMinor,
    valueWithoutTaxMinor,
  };
}

function readError(value: unknown): string | null {
  if (!isRecord(value) || !isRecord(value.error)) {
    return null;
  }

  const message = value.error.message;

  return typeof message === "string" && message.length > 0 ? message : null;
}

export function ProposalesBuilder({
  inquiryId,
  inquiry,
  catalog,
  unmatchedRequirements,
}: ProposalesBuilderProps) {
  const [selections, setSelections] = useState<Record<number, SelectedProductState>>(() =>
    Object.fromEntries(
      catalog.products.map((product) => [
        product.variationId,
        {
          selected: true,
          amount: defaultAmount(product.quantityMode, inquiry),
        },
      ]),
    ),
  );

  const [state, setState] = useState<BuilderState>({
    status: "idle",
  });

  const selectedCount = useMemo(
    () => Object.values(selections).filter((selection) => selection.selected).length,
    [selections],
  );

  function updateSelection(variationId: number, next: Partial<SelectedProductState>): void {
    setSelections((current) => {
      const existing = current[variationId];

      if (!existing) {
        return current;
      }

      return {
        ...current,
        [variationId]: {
          ...existing,
          ...next,
        },
      };
    });
  }

  async function createProposal(): Promise<void> {
    const selectedProducts = catalog.products.flatMap((product) => {
      const selection = selections[product.variationId];

      if (!selection?.selected) {
        return [];
      }

      return [
        {
          variationId: product.variationId,
          amount: selection.amount,
        },
      ];
    });

    if (selectedProducts.length === 0) {
      setState({
        status: "error",
        message: "Select at least one product.",
      });

      return;
    }

    setState({
      status: "pending",
    });

    try {
      const response = await fetch(`/api/inquiries/${encodeURIComponent(inquiryId)}/proposales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selections: selectedProducts,
        }),
      });

      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setState({
          status: "error",
          message: readError(body) ?? "The Proposales proposal could not be created.",
        });

        return;
      }

      const proposal = readSuccess(body);

      if (!proposal) {
        setState({
          status: "error",
          message: "Proposales returned an invalid proposal response.",
        });

        return;
      }

      setState({
        status: "success",
        ...proposal,
      });
    } catch {
      setState({
        status: "error",
        message: "The Proposales API could not be reached.",
      });
    }
  }

  const nights = calculateNightCount(inquiry);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Live Proposales Content Library
          </p>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">
            Build the proposal from real Proposales products
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Products and currency come directly from Proposales. This app only decides which
            products to include and calculates their quantities from the reviewed inquiry.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm">
          <p className="font-semibold text-zinc-950">{catalog.companyName}</p>
          <p className="mt-1 text-zinc-600">Currency: {catalog.currency}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs font-semibold uppercase text-zinc-500">Guests</p>
          <p className="mt-1 font-semibold text-zinc-950">{inquiry.guests ?? "Not provided"}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase text-zinc-500">Rooms</p>
          <p className="mt-1 font-semibold text-zinc-950">{inquiry.rooms ?? "Not provided"}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase text-zinc-500">Stay</p>
          <p className="mt-1 font-semibold text-zinc-950">
            {inquiry.startDate && inquiry.endDate
              ? `${inquiry.startDate} – ${inquiry.endDate}`
              : "Not provided"}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase text-zinc-500">Nights</p>
          <p className="mt-1 font-semibold text-zinc-950">{nights ?? "Not available"}</p>
        </div>
      </div>

      {catalog.products.length > 0 ? (
        <div className="mt-7 space-y-4">
          {catalog.products.map((product) => {
            const selection = selections[product.variationId];

            if (!selection) {
              return null;
            }

            const checkboxId = `proposales-${product.variationId}`;

            return (
              <div key={product.variationId} className="rounded-2xl border border-zinc-200 p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex max-w-2xl items-start gap-3">
                    <input
                      id={checkboxId}
                      type="checkbox"
                      checked={selection.selected}
                      onChange={(event) =>
                        updateSelection(product.variationId, {
                          selected: event.target.checked,
                        })
                      }
                      className="mt-1 h-4 w-4 rounded border-zinc-300"
                    />

                    <label htmlFor={checkboxId} className="cursor-pointer">
                      <span className="block font-semibold text-zinc-950">{product.title}</span>

                      {product.description ? (
                        <span className="mt-1 block text-sm leading-6 text-zinc-600">
                          {product.description}
                        </span>
                      ) : null}

                      <span className="mt-2 block text-xs font-medium text-zinc-500">
                        Live variation #{product.variationId}
                      </span>
                    </label>
                  </div>

                  <label className="block sm:w-44">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {inputLabel(product.quantityMode)}
                    </span>

                    <input
                      type="number"
                      min={1}
                      max={10000}
                      step={1}
                      disabled={!selection.selected}
                      value={selection.amount}
                      onChange={(event) => {
                        const parsed = Number(event.target.value);

                        updateSelection(product.variationId, {
                          amount: Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1,
                        });
                      }}
                      className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none disabled:bg-zinc-100 disabled:text-zinc-400"
                    />

                    <span className="mt-2 block text-xs leading-5 text-zinc-500">
                      {quantityDescription(product, selection.amount, inquiry)}
                    </span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          None of the reviewed requirements matched a live Proposales product.
        </div>
      )}

      {unmatchedRequirements.length > 0 ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-950">
            Reviewed requirements without a catalog match
          </p>

          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
            {unmatchedRequirements.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={state.status === "pending" || state.status === "success" || selectedCount === 0}
          onClick={createProposal}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state.status === "pending"
            ? "Creating in Proposales..."
            : state.status === "success"
              ? "Proposales proposal created"
              : `Create in Proposales (${selectedCount})`}
        </button>

        <p className="text-xs leading-5 text-zinc-500">
          Prices, VAT and monetary totals remain owned by Proposales.
        </p>
      </div>

      {state.status === "error" ? (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
        >
          {state.message}
        </p>
      ) : null}

      {state.status === "success" ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-semibold text-emerald-950">Real Proposales draft created</p>

          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-700">Total excl. VAT</p>
              <p className="mt-1 font-semibold text-emerald-950">
                {state.valueWithoutTaxMinor === null
                  ? "Not returned"
                  : formatMoney(state.valueWithoutTaxMinor, state.currency)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-emerald-700">Total incl. VAT</p>
              <p className="mt-1 font-semibold text-emerald-950">
                {state.valueWithTaxMinor === null
                  ? "Not returned"
                  : formatMoney(state.valueWithTaxMinor, state.currency)}
              </p>
            </div>
          </div>

          <a
            href={state.url}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex text-sm font-semibold text-emerald-800 underline underline-offset-4"
          >
            Open draft in Proposales
          </a>
        </div>
      ) : null}
    </section>
  );
}
