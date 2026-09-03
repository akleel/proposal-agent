import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Proposal Agent
          </p>

          <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-zinc-950 sm:text-6xl">
            From messy customer inquiry to review-ready proposal.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
            A production-minded exploration of reliable, human-reviewed proposal automation.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/inquiries/new"
              className="inline-flex min-h-11 items-center rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Create inquiry
            </Link>
          </div>
        </div>

        <section className="mt-20 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <p className="text-sm font-semibold text-zinc-950">01 · Source</p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Preserve the original customer inquiry.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <p className="text-sm font-semibold text-zinc-950">02 · Review</p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Structured extraction surfaces uncertainty and provenance.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <p className="text-sm font-semibold text-zinc-950">03 · Proposal</p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Deterministic pricing and proposal drafting remain under application control.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
