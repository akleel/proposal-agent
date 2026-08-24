import { inquiryIdSchema } from "@proposal-agent/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getInquiryUseCase,
} from "@/lib/server/inquiries";

import {
  ExtractionPanel,
} from "./extraction-panel";

interface InquiryPageProps {
  readonly params: Promise<{
    readonly id: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function InquiryPage({
  params,
}: InquiryPageProps) {
  const { id } = await params;

  const parsedId = inquiryIdSchema.safeParse(id);

  if (!parsedId.success) {
    notFound();
  }

  const inquiry = await getInquiryUseCase(parsedId.data);

  if (!inquiry) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-950"
          >
            ← Proposal Agent
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
                The original customer text remains the durable
                source. AI interpretation is shown separately below.
              </p>
            </div>

            <dl className="mt-6 grid gap-4 border-y border-zinc-200 py-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Inquiry ID
                </dt>

                <dd className="mt-1 break-all text-sm font-medium text-zinc-900">
                  {inquiry.id}
                </dd>
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
              <h2 className="text-sm font-semibold text-zinc-950">
                Original customer text
              </h2>

              <p className="mt-3 whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm leading-7 text-zinc-800">
                {inquiry.rawText}
              </p>
            </div>
          </section>

          <ExtractionPanel inquiryId={inquiry.id} />
        </div>
      </div>
    </main>
  );
}
