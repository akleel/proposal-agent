# Code Map

Use this page to answer:

> **Where does that behavior live?**

## Flow

```text
create -> extract -> review -> resolve -> match -> create proposal
```

## `apps/web`

| File | Purpose |
| --- | --- |
| `src/app/page.tsx` | Home page and entry point. |
| `src/app/layout.tsx` | Global Next.js layout and metadata. |
| `src/app/globals.css` | Global styles. |
| `src/app/inquiries/new/page.tsx` | New-inquiry page wrapper. |
| `src/app/inquiries/new/inquiry-form.tsx` | Customer inquiry form UI. |
| `src/app/inquiries/new/actions.ts` | Validates, rate-limits, saves, and redirects after inquiry creation. |
| `src/app/inquiries/[id]/page.tsx` | Loads an inquiry and its persisted review state. |
| `src/app/inquiries/[id]/extraction-panel.tsx` | Extraction/review UI. |
| `src/app/inquiries/[id]/actions.ts` | Runs extraction and saves human review decisions. |
| `src/app/inquiries/[id]/types.ts` | Serializable UI-facing review types. |
| `src/app/inquiries/[id]/not-found.tsx` | Missing-inquiry UI. |
| `src/app/inquiries/[id]/proposales/page.tsx` | Blocks unresolved inquiries, loads catalog, resolves product matches. |
| `src/app/inquiries/[id]/proposales/proposales-builder.tsx` | Lets the user confirm products/amounts and create a proposal. |
| `src/app/api/inquiries/[id]/proposales/route.ts` | Trusted POST boundary that revalidates and creates the proposal. |
| `src/lib/server/database.ts` | Shared PostgreSQL pool. |
| `src/lib/server/inquiries.ts` | Wires inquiry use-cases to PostgreSQL and Gemini. |
| `src/lib/server/demo-rate-limit.ts` | Anonymous AI/write rate limiting. |
| `src/lib/server/proposales.ts` | Proposales API adapter, catalog parsing, quantity rules, lexical match, proposal creation. |
| `src/lib/server/proposales-catalog-matching.ts` | Lexical-first + Gemini semantic matching, persistence, input-hash invalidation. |

## `packages/application`

| File | Purpose |
| --- | --- |
| `src/inquiry-repository.ts` | Inquiry persistence port. |
| `src/inquiry-review-repository.ts` | Extraction/review persistence port. |
| `src/inquiry-extractor.ts` | AI extraction port. |
| `src/create-inquiry.ts` | Creates and stores an inquiry. |
| `src/get-inquiry.ts` | Loads an inquiry. |
| `src/extract-inquiry.ts` | Runs an extractor against inquiry text. |
| `src/extract-inquiry-review.ts` | Extracts and persists a new review snapshot. |
| `src/get-inquiry-review.ts` | Loads persisted review state. |
| `src/save-inquiry-review-decision.ts` | Validates and saves one human decision. |
| `src/inquiry-review-state.ts` | Builds UI-facing review state. |
| `src/get-resolved-inquiry.ts` | Returns `not_extracted`, `review_required`, or `ready`. |
| `src/index.ts` | Package exports. |

## `packages/domain`

| File | Purpose |
| --- | --- |
| `src/inquiry.ts` | Core inquiry/extraction types and review-issue detection. |
| `src/review-decision.ts` | Validates accepted/corrected human decisions. |
| `src/resolved-inquiry.ts` | Produces trusted `ResolvedInquiry` only after required review. |
| `src/iso-date.ts` | ISO date validation. |
| `src/index.ts` | Package exports. |

## `packages/contracts`

| File | Purpose |
| --- | --- |
| `src/create-inquiry.ts` | Runtime schema for new inquiry input. |
| `src/inquiry.ts` | Runtime schema for extracted inquiry data. |
| `src/review-decision.ts` | Runtime schema for review requests. |
| `src/index.ts` | Package exports. |

## `packages/ai`

| File | Purpose |
| --- | --- |
| `src/google/gemini-inquiry-extractor.ts` | Sends inquiry text to Gemini for structured extraction. |
| `src/extraction/model-inquiry-extraction.ts` | Schema for raw Gemini extraction output. |
| `src/extraction/to-inquiry-extraction.ts` | Applies the deterministic 95% + evidence review policy. |
| `src/google/gemini-catalog-matcher.ts` | Semantic matching against the supplied Proposales catalog. |
| `src/catalog-match.ts` | Catalog-matcher types and model-output ID validation. |
| `src/fake-inquiry-extractor.ts` | Deterministic extractor/test double that can replace Gemini during testing. |
| `src/index.ts` | Package exports. |
| `scripts/eval-live.ts` | Manual live Gemini extraction. |
| `scripts/eval-adversarial.ts` | Prompt-injection/adversarial evaluation. |
| `scripts/eval-bookings.ts` | Booking evaluation runner. |
| `scripts/booking-eval-cases.ts` | Booking evaluation cases. |

## `packages/db`

| File | Purpose |
| --- | --- |
| `src/client.ts` | PostgreSQL pool creation. |
| `src/env.ts` | Database script environment loading. |
| `src/migrations.ts` | Checksum-protected migration runner. |
| `src/repositories/postgres-inquiry-repository.ts` | Stores original inquiries. |
| `src/repositories/postgres-inquiry-review-repository.ts` | Stores extraction snapshots and human decisions; clears stale decisions on re-extraction. |
| `src/repositories/postgres-rate-limit-repository.ts` | Atomic rate-limit persistence. |
| `src/repositories/postgres-inquiry-catalog-match-repository.ts` | Stores input-hashed catalog-match decisions. |
| `src/index.ts` | Package exports. |
| `scripts/migrate.ts` | Migration CLI. |

## Migrations

| Migration | Purpose |
| --- | --- |
| `0001_create_inquiries.sql` | Creates inquiries. |
| `0002_persist_inquiry_reviews.sql` | Adds extraction snapshots and review decisions. |
| `0003_create_proposal_drafts.sql` | Historical local proposal-draft model. |
| `0004_create_demo_rate_limits.sql` | Adds persisted demo rate limiting. |
| `0005_drop_obsolete_proposal_drafts.sql` | Removes local proposal drafts and old budget data. |
| `0006_create_inquiry_catalog_matches.sql` | Adds persisted catalog matching. |

## Tests

| Location | Purpose |
| --- | --- |
| `packages/domain/tests` | Business-rule tests. |
| `packages/application/tests` | Use-case tests with fake dependencies. |
| `packages/contracts/tests` | Runtime-schema tests. |
| `packages/ai/tests` | Deterministic AI-boundary validation tests. |
| `packages/db/tests/integration` | PostgreSQL integration tests. |
| `tests/e2e/inquiry.spec.ts` | Browser inquiry persistence flow. |

## Five files that explain the project fastest

1. `packages/ai/src/google/gemini-inquiry-extractor.ts` — AI extraction.
2. `packages/ai/src/extraction/to-inquiry-extraction.ts` — deterministic trust/review policy.
3. `apps/web/src/app/inquiries/[id]/proposales/page.tsx` — review gate into Proposales.
4. `apps/web/src/lib/server/proposales-catalog-matching.ts` — lexical + semantic product matching.
5. `apps/web/src/lib/server/proposales.ts` — live Proposales API integration and proposal creation.
