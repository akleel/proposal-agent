import Link from "next/link";

export default function InquiryNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">404</p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
          Inquiry not found
        </h1>

        <p className="mt-3 text-zinc-600">
          The inquiry does not exist or the identifier is invalid.
        </p>

        <Link
          href="/inquiries/new"
          className="mt-8 inline-flex rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Create an inquiry
        </Link>
      </div>
    </main>
  );
}
