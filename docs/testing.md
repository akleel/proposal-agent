# Testing

## Commands

Deterministic quality gate:

```powershell
pnpm check
```

This runs:

```text
format check
lint
typecheck
unit tests
production build
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

Visible browser:

```powershell
pnpm test:e2e:headed
```

## Unit tests

### Domain

`packages/domain/tests`

Covers review issues, accepted/corrected decisions, date validation, stale/tampered decisions, and `ResolvedInquiry`.

### Application

`packages/application/tests`

Covers inquiry creation/loading, extraction delegation, review persistence, human decisions, and the `not_extracted` / `review_required` / `ready` states.

Uses fake/in-memory dependencies.

### Contracts

`packages/contracts/tests`

Covers Zod validation for inquiry input, extraction data, dates, confidence, source nullability, and review requests.

### AI

`packages/ai/tests`

Covers deterministic validation around model output, including review thresholds/evidence and catalog variation-ID validation.

These tests do not require a live Gemini call.

## PostgreSQL integration tests

`packages/db/tests/integration`

Covers:

- inquiry persistence
- extraction/review persistence
- clearing stale review decisions after re-extraction
- malformed persisted data rejection
- atomic rate limiting

Requires the test PostgreSQL database.

## Browser E2E

`tests/e2e/inquiry.spec.ts`

Currently verifies the browser inquiry flow:

```text
open app
-> create inquiry
-> persist
-> open inquiry page
-> reload
-> inquiry remains available
```

It does not currently run the full live Gemini + Proposales workflow.

## Live Gemini evaluation

These commands require `GEMINI_API_KEY` and are intentionally separate from deterministic CI.

One inquiry:

```powershell
pnpm --filter @proposal-agent/ai exec tsx scripts/eval-live.ts
```

Prompt-injection/adversarial cases:

```powershell
pnpm --filter @proposal-agent/ai exec tsx scripts/eval-adversarial.ts
```

Booking baseline:

```powershell
pnpm --filter @proposal-agent/ai exec tsx scripts/eval-bookings.ts
```

The booking baseline covers normal bookings, dates, durations, requirements, semantic wording, ambiguity, negation, typos, and unsupported concepts.

## Proposales testing status

The Proposales adapter is exercised through application use and build/type checks, but there is no deterministic mock/integration suite covering the complete Proposales API flow yet.

A useful next test would mock the Proposales HTTP boundary and verify:

- company/catalog parsing
- proposal request payloads
- upstream error mapping
- unauthorized variation rejection
- quantity calculation

## CI

GitHub Actions currently runs:

```text
lint
typecheck
unit tests
database migration
PostgreSQL integration tests
production build
Playwright E2E
```

Live Gemini and Proposales calls stay outside deterministic CI because they require external credentials and provider availability.
