import Link from "next/link";
import { notFound } from "next/navigation";

import { inquiryIdSchema } from "@proposal-agent/contracts";

import { getInquiryUseCase, getPersistedResolvedInquiryUseCase } from "@/lib/server/inquiries";
import {
  getProposalesCatalog,
  matchProposalesCatalog,
  ProposalesApiError,
  type ProposalesCatalog,
} from "@/lib/server/proposales";

import { ProposalesBuilder } from "./proposales-builder";

interface ProposalesInquiryPageProps {
  readonly params: Promise<{
    readonly id: string;
  }>;
}

type CatalogLoadResult =
  | {
      readonly status: "success";
      readonly catalog: ProposalesCatalog;
    }
  | {
      readonly status: "error";
      readonly message: string;
    };

export const dynamic = "force-dynamic";

async function loadProposalesCatalog(): Promise<CatalogLoadResult> {
  try {
    return {
      status: "success",
      catalog: await getProposalesCatalog(),
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ProposalesApiError
          ? error.message
          : "The Proposales Content Library could not be loaded.",
    };
  }
}

export default async function ProposalesInquiryPage({ params }: ProposalesInquiryPageProps) {
  const { id } = await params;

  const parsedId = inquiryIdSchema.safeParse(id);

  if (!parsedId.success) {
    notFound();
  }

  const [inquiry, resolved] = await Promise.all([
    getInquiryUseCase(parsedId.data),
    getPersistedResolvedInquiryUseCase(parsedId.data),
  ]);

  if (!inquiry) {
    notFound();
  }

  if (resolved.status !== "ready") {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <Link
            href={`/inquiries/${parsedId.data}`}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-950"
          >
            Back to inquiry
          </Link>

          <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h1 className="text-xl font-semibold text-amber-950">
              Complete the inquiry review first
            </h1>

            <p className="mt-2 text-sm leading-6 text-amber-800">
              Proposales product selection becomes available once extraction and all required human
              review are complete.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const catalogResult = await loadProposalesCatalog();

  if (catalogResult.status === "error") {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <Link
            href={`/inquiries/${parsedId.data}`}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-950"
          >
            Back to inquiry
          </Link>

          <section className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-xl font-semibold text-red-950">Proposales is unavailable</h1>

            <p className="mt-2 text-sm leading-6 text-red-800">{catalogResult.message}</p>
          </section>
        </div>
      </main>
    );
  }

  const catalogMatch = matchProposalesCatalog(catalogResult.catalog, resolved.inquiry.requirements);

  const requestedCatalog: ProposalesCatalog = {
    ...catalogResult.catalog,
    products: catalogMatch.products,
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/inquiries/${parsedId.data}`}
          className="text-sm font-medium text-zinc-600 hover:text-zinc-950"
        >
          Back to inquiry
        </Link>

        <div className="mt-8">
          <ProposalesBuilder
            inquiryId={parsedId.data}
            inquiry={resolved.inquiry}
            catalog={requestedCatalog}
            unmatchedRequirements={catalogMatch.unmatchedRequirements}
          />
        </div>
      </div>
    </main>
  );
}
