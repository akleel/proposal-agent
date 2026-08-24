import { inquiryIdSchema } from "@proposal-agent/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getInquiryUseCase } from "@/lib/server/inquiries";

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
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
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

        <section className="mt-10 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <header className="border-b border-zinc-200 px-8 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Saved inquiry
                </p>

                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                  Customer source material
                </h1>
              </div>

              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Persisted
              </span>
            </div>
          </header>

          <div className="space-y-8 p-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Inquiry ID
              </p>

              <p className="mt-2 break-all font-mono text-sm text-zinc-700">
                {inquiry.id}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Received
              </p>

              <time
                dateTime={inquiry.createdAt.toISOString()}
                className="mt-2 block text-sm text-zinc-700"
              >
                {inquiry.createdAt.toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "UTC",
                })}{" "}
                UTC
              </time>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Raw inquiry
              </p>

              <div className="mt-3 whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm leading-7 text-zinc-800">
                {inquiry.rawText}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 rounded-xl border border-dashed border-zinc-300 p-5">
          <p className="text-sm font-medium text-zinc-800">
            Next milestone
          </p>

          <p className="mt-1 text-sm leading-6 text-zinc-500">
            This saved source material will become the input to
            structured AI extraction and human review.
          </p>
        </div>
      </div>
    </main>
  );
}
