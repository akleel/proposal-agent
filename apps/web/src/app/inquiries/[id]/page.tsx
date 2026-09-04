import { inquiryIdSchema } from "@proposal-agent/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getInquiryUseCase, getPersistedInquiryReviewUseCase } from "@/lib/server/inquiries";

import { ExtractionPanel } from "./extraction-panel";
import { serializeInquiryReview } from "./types";

interface InquiryPageProps {
  readonly params: Promise<{
    readonly id: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function InquiryPage({ params }: InquiryPageProps) {
  const { id } = await params;

  const parsedId = inquiryIdSchema.safeParse(id);

  if (!parsedId.success) {
    notFound();
  }

  const [inquiry, review] = await Promise.all([
    getInquiryUseCase(parsedId.data),
    getPersistedInquiryReviewUseCase(parsedId.data),
  ]);

  if (!inquiry) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-sm font-medium text-zinc-600 hover:text-zinc-950">
            â† Proposal Agent
          </Link>

          <Link
            href="/inquiries/new"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-950"
          >
            New inquiry
          </Link>
        </div>

        <div className="mt-10 space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Persisted inquiry
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
                Customer inquiry
              </h1>

              <p className="mt-3 text-sm leading-6 text-zinc-600">
                The original customer text remains the durable source. AI interpretation and human
                review are persisted separately below.
              </p>
            </div>

            <dl className="mt-6 grid gap-4 border-y border-zinc-200 py-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Inquiry ID
                </dt>

                <dd className="mt-1 break-all text-sm font-medium text-zinc-900">{inquiry.id}</dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Created
                </dt>

                <dd className="mt-1 text-sm font-medium text-zinc-900">
                  {inquiry.createdAt.toISOString()}
                </dd>
              </div>
            </dl>

            <div className="mt-6">
              <h2 className="text-sm font-semibold text-zinc-950">Original customer text</h2>

              <p className="mt-3 whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm leading-7 text-zinc-800">
                {inquiry.rawText}
              </p>
            </div>
          </section>

          <ExtractionPanel
            inquiryId={inquiry.id}
            initialResult={review ? serializeInquiryReview(review) : null}
          />

          <section className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
              Proposales
            </p>

            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-blue-950">
              Build the proposal with the live Proposales catalog
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-800">
              Continue with real Proposales Content Library products. Proposales owns product
              pricing, VAT, company currency and the final proposal totals.
            </p>

            <Link
              href={`/inquiries/${parsedId.data}/proposales`}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Open Proposales builder
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
