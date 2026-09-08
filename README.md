# Proposal Agent

[![CI](https://github.com/akleel/proposal-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/akleel/proposal-agent/actions/workflows/ci.yml)

> From unstructured customer inquiry to a reviewed Proposales proposal.

Proposal Agent is a proposal automation project that turns customer booking inquiries into structured, reviewable data and creates proposal drafts through the Proposales API.

The main engineering principle is:

> **AI interprets language. Application code decides what is trusted. Proposales owns commercial data.**

## Current flow

```text
Customer inquiry
      |
      v
Gemini extraction
      |
      v
Deterministic confidence + evidence checks
      |
      v
Human review when required
      |
      v
ResolvedInquiry
      |
      v
Live Proposales Content Library
      |
      v
Lexical product matching
      |
      +-- unresolved wording --> Gemini semantic matching
      |
      v
User confirms products and quantities
      |
      v
Server-side validation
      |
      v
Proposales POST /proposals
      |
      v
Real proposal draft
```

## What is implemented

- Create and persist customer inquiries in PostgreSQL.
- Extract guests, rooms, dates, and customer requirements with Gemini.
- Store confidence and source evidence for extracted fields.
- Require human review when deterministic trust checks fail.
- Persist accepted and corrected review decisions.
- Derive a trusted `ResolvedInquiry` only after required review is complete.
- Load the live Proposales Content Library.
- Match requirements lexically before using Gemini for semantic matching.
- Validate Gemini-returned variation IDs against the supplied catalog.
- Let the user confirm products and quantities.
- Revalidate selections on the server before proposal creation.
- Create real proposal drafts through the Proposales API.
- Keep prices, VAT, currency, and proposal totals authoritative in Proposales.
- Persist catalog-match decisions with input-hash invalidation.
- Apply persisted demo rate limits to AI and write operations.
- Test domain, application, contracts, AI boundaries, PostgreSQL persistence, and the browser inquiry flow.

## AI trust boundary

Gemini extracts:

```text
guests
rooms
startDate
endDate
requirements[]
```

Each extracted field includes:

```text
value
confidence
source
requiresReview
```

The model does not decide whether review is required. Application code requires review when:

```text
value is null
OR source is null
OR confidence < 0.95
OR source evidence is not present in the original inquiry
```

Human decisions are either `accepted` or `corrected`. Corrections are validated before they become trusted.

Rerunning extraction replaces the extraction snapshot and clears previous review decisions so stale approvals cannot carry over to new model output.

Only a `ready` inquiry exposes a `ResolvedInquiry` for downstream proposal work.

## Product matching

The application loads products from the live Proposales Content Library.

Matching is intentionally conservative:

1. Try normalized lexical title matching.
2. Send only unresolved requirements to Gemini for semantic matching.
3. Validate every returned variation ID against the supplied catalog.
4. Fall back to lexical-only results if semantic matching fails.

Persisted semantic decisions are tied to a SHA-256 hash of the reviewed inquiry and relevant catalog input, so they are reused only while those inputs remain unchanged.

## Proposales integration

The server uses Proposales API v3:

```text
GET  /companies
GET  /content?company_id={id}
POST /proposals
GET  /proposals/{uuid}
```

The application sends validated product variation IDs and quantities.

Proposales remains responsible for:

- product prices;
- VAT;
- currency;
- proposal totals;
- the actual proposal draft.

The application does not maintain a duplicate authoritative product or pricing system.

## Architecture

```text
apps/web
   |
   v
packages/application
   |
   v
packages/domain

packages/ai  -> implements AI behavior behind application ports
packages/db  -> implements persistence behind application ports
packages/contracts -> runtime boundary validation

Proposales API -> external catalog and proposal authority
PostgreSQL     -> inquiry/review/match persistence
```

See:

- [Architecture](docs/architecture.md)
- [Code map](docs/code-map.md)
- [Testing](docs/testing.md)
- [Local development runbook](docs/runbook.md)
- [Architecture decisions](docs/decisions/)

## Local development

Requirements:

- Node.js 24
- pnpm 11
- Docker with Docker Compose

Install and start PostgreSQL:

```powershell
pnpm install
pnpm db:up
pnpm db:migrate
```

Start the web app:

```powershell
pnpm dev
```

Open:

```text
http://localhost:3000
```

## Environment

Copy `.env.example` to `.env`.

```text
DATABASE_URL
TEST_DATABASE_URL

GEMINI_API_KEY
GEMINI_MODEL

PROPOSALES_API_KEY
PROPOSALES_COMPANY_ID
PROPOSALES_LANGUAGE

DEMO_RATE_LIMIT_SECRET
```

`GEMINI_MODEL` defaults to `gemini-3.6-flash`.

`PROPOSALES_COMPANY_ID` is optional when the API token can access exactly one company.

`PROPOSALES_LANGUAGE` defaults to `en`.

`DEMO_RATE_LIMIT_SECRET` is required in production and must contain at least 32 characters. Without it, demo rate limiting is disabled in non-production environments.

Never commit real credentials.

## Testing

Run the deterministic quality gate:

```powershell
pnpm check
```

PostgreSQL integration tests:

```powershell
pnpm db:up
pnpm test:integration
```

Browser E2E:

```powershell
pnpm test:e2e
```

Live Gemini evaluations:

```powershell
pnpm --filter @proposal-agent/ai exec tsx scripts/eval-live.ts
pnpm --filter @proposal-agent/ai exec tsx scripts/eval-adversarial.ts
pnpm --filter @proposal-agent/ai exec tsx scripts/eval-bookings.ts
```

Live Gemini and Proposales calls remain separate from deterministic CI because they require external credentials and provider availability.

## Current limitations

- Quantity mode is inferred from product titles because the current Proposales Content API response does not expose enough quantity semantics for this demo.
- Browser E2E currently covers inquiry persistence, not the full live Gemini + Proposales workflow.
- The Proposales adapter does not yet have a dedicated deterministic mocked API test suite.

These limitations are documented rather than hidden behind speculative abstractions.
