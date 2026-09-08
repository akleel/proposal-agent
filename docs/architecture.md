# Architecture

## Principle

> **AI interprets language. Application code decides what is trusted. Proposales owns commercial data.**

The system keeps probabilistic AI output behind deterministic validation, with human review required for uncertain fields before proposal creation.

## Runtime flow

```text
Browser
  |
  | create inquiry
  v
Next.js server action
  |
  | validate + rate limit
  v
application/createInquiry
  |
  v
PostgreSQL: inquiries
  |
  | user runs extraction
  v
GeminiInquiryExtractor
  |
  | structured output
  v
toInquiryExtraction
  |
  | confidence + evidence policy
  v
PostgreSQL: extraction + review decisions
  |
  | human accepts/corrects flagged fields
  v
resolveReviewedInquiry
  |
  v
ResolvedInquiry
  |
  | status must be "ready"
  v
Live Proposales catalog
  |
  v
lexical matching
  |
  +-- unresolved wording --> GeminiCatalogMatcher
  |                         |
  |                         v
  |                    validate IDs
  +-------------------------+
  |
  v
user confirms selection
  |
  v
POST /api/inquiries/{id}/proposales
  |
  | revalidate inquiry + catalog + selection
  v
POST Proposales /proposals
  |
  v
GET Proposales /proposals/{uuid}
```

## Layers

### `apps/web`

Owns framework concerns:

- Next.js pages and React components
- server actions and route handlers
- dependency composition
- Proposales HTTP integration
- demo rate limiting

### `packages/application`

Owns use-cases:

- create/get inquiry
- extract and persist review state
- save review decisions
- derive downstream workflow state

It depends on ports rather than PostgreSQL or Gemini implementations.

### `packages/domain`

Owns deterministic business rules:

- review issues
- valid human decisions
- resolved/trusted inquiry
- ISO date validation

It does not depend on React, Gemini, PostgreSQL, or Proposales.

### `packages/contracts`

Owns runtime schemas for serialized/external input.

### `packages/ai`

Owns AI-specific behavior:

- Gemini inquiry extraction
- Gemini catalog matching
- structured-output schemas
- validation of model-returned catalog IDs

### `packages/db`

Owns PostgreSQL:

- connection pool
- migrations
- inquiry repository
- extraction/review repository
- catalog-match repository
- rate-limit repository

## Inquiry trust boundary

Gemini extracts:

```text
guests
rooms
startDate
endDate
requirements[]
```

Each extracted field has:

```text
value
confidence
source
requiresReview
```

`requiresReview` is application-controlled. Review is required when:

```text
value is null
OR source is null
OR confidence < 0.95
OR source evidence is not present in the original inquiry
```

Human decisions are either:

- `accepted`
- `corrected`

Corrections are validated by domain code. A missing AI value cannot be accepted; it must be corrected.

Rerunning extraction replaces the extraction snapshot and deletes previous human decisions in the same transaction. This prevents stale approvals from being applied to new model output.

The downstream state is one of:

```text
not_extracted
review_required
ready
```

Only `ready` exposes a `ResolvedInquiry`.

## Date handling

Gemini receives a trusted reference date so it can normalize clear relative/yearless dates. That reference date is context, not evidence. Evidence must still come from the customer inquiry.

## Catalog matching

Matching has two stages.

1. `matchProposalesCatalog` performs conservative normalized title matching.
2. Only unresolved requirements are sent to `GeminiCatalogMatcher`.

The semantic matcher receives the reviewed requirement, booking context, and current live catalog. Returned variation IDs are validated against that supplied catalog.

Semantic decisions are persisted with a SHA-256 hash of the reviewed inquiry and relevant catalog input. A persisted decision is reused only while those inputs are unchanged.

If semantic matching fails, the system returns the conservative lexical result.

## Proposal authorization

Browser input is untrusted.

Before creating a proposal, the route handler checks:

- inquiry ID and JSON shape
- positive whole-number selections
- `ResolvedInquiry` status
- demo write rate limit
- current Proposales catalog
- current authorized catalog match
- selected variation IDs
- duplicate selections
- calculated quantities

The proposal-creation route does not call Gemini. It can use a still-valid persisted semantic decision; otherwise it falls back to lexical matching.

## Proposales authority

The server uses Proposales API v3 to:

```text
GET  /companies
GET  /content?company_id={id}
POST /proposals
GET  /proposals/{uuid}
```

The live Content Library is the catalog authority.

The application sends product variation IDs and quantities. Proposales remains responsible for:

- prices
- VAT
- currency
- proposal totals
- the actual proposal draft

## Quantity heuristic

The current demo infers quantity mode from product titles because the Content API response does not expose enough quantity semantics.

```text
breakfast/lunch/dinner -> person_night
late checkout          -> room_once
meeting room           -> day
room/suite             -> room_night
other                  -> unit
```

For `room_night` and `person_night`, the selected amount is multiplied by the number of nights derived from the reviewed start and end dates.

This is a documented limitation, not catalog authority.

## Persistence

Current tables:

```text
schema_migrations
inquiries
inquiry_extractions
inquiry_review_decisions
demo_rate_limits
inquiry_catalog_matches
```

`ResolvedInquiry` is derived state and is not stored separately.

Migration `0003` historically created `proposal_drafts`; migration `0005` removes it.

## Failure behavior

The system fails conservatively:

- invalid/missing extraction data -> human review
- invalid persisted review decision -> resolution fails
- unavailable semantic matcher -> lexical-only result
- unknown model-returned catalog ID -> reject model output
- invalid browser selection -> reject request
- Proposales network/upstream failure -> return an API error; do not pretend a proposal exists

## Design trade-offs

The current package boundaries add some files, but they keep the domain and application logic testable without React, PostgreSQL, or Gemini. For this project that separation is intentional.

The largest remaining maintenance candidates are `proposales.ts` and the two large client components. They should only be split when a change needs it; avoiding speculative abstraction keeps the code KISS.

See [`code-map.md`](code-map.md) for file locations and [`decisions/`](decisions/) for rationale.
