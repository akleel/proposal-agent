import Link from "next/link";

import { InquiryForm } from "./inquiry-form";

export const metadata = {
  title: "New inquiry | Proposal Agent",
};

export default function NewInquiryPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-medium text-zinc-600 hover:text-zinc-950">
          ← Proposal Agent
        </Link>

        <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Inquiry
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
              Create a customer inquiry
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600">
              Start with the source material exactly as the salesperson received it.
            </p>
          </div>

          <InquiryForm />
        </div>
      </div>
    </main>
  );
}
