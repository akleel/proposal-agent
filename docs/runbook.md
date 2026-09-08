# Local Development Runbook

## Requirements

- Node.js 24
- pnpm 11
- Docker with Docker Compose

## Start locally

Install:

```powershell
pnpm install
```

Copy `.env.example` to `.env`.

Start PostgreSQL and migrate:

```powershell
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

### Database

```text
DATABASE_URL
TEST_DATABASE_URL
```

The values in `.env.example` target the local Docker PostgreSQL instance.

### Gemini

```text
GEMINI_API_KEY
GEMINI_MODEL
```

`GEMINI_API_KEY` is required for browser extraction and live AI evaluation.
`GEMINI_MODEL` is optional and defaults to `gemini-3.6-flash`.

### Proposales

```text
PROPOSALES_API_KEY
PROPOSALES_COMPANY_ID
PROPOSALES_LANGUAGE
```

`PROPOSALES_API_KEY` is required for the Proposales workflow.

`PROPOSALES_COMPANY_ID` is optional when the API key can access exactly one company. Set it when multiple companies are available.

`PROPOSALES_LANGUAGE` defaults to `en`.

### Demo rate limiting

```text
DEMO_RATE_LIMIT_SECRET
```

In production this is required and must contain at least 32 characters. In non-production, rate limiting is disabled when it is absent.

Never commit real credentials.

## Manual happy path

1. Open `/inquiries/new`.
2. Enter a fictional customer booking inquiry.
3. Save it.
4. Run Gemini extraction.
5. Review any flagged fields.
6. Continue to the Proposales builder once the inquiry is `ready`.
7. Review matched products and quantities.
8. Create the proposal.
9. Open the returned Proposales URL.

## Quality checks

```powershell
pnpm check
```

Database integration tests:

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

## Stop PostgreSQL

```powershell
pnpm db:down
```

## Troubleshooting

### Missing `GEMINI_API_KEY`

Set `GEMINI_API_KEY` in `.env` and restart the dev server.

### Proposales integration is not configured

Set `PROPOSALES_API_KEY`.

If the token can access multiple companies, also set `PROPOSALES_COMPANY_ID`.

### Proposales builder says review is incomplete

Return to the inquiry page and accept/correct every flagged field.

### Expected product was not matched

Check:

1. the reviewed requirement text;
2. the live Proposales Content Library;
3. whether lexical matching should have matched the product title;
4. whether Gemini semantic matching is configured.

If Gemini matching fails, the app intentionally falls back to lexical matching.

### Review decisions disappeared after extraction

Expected behavior. Rerunning extraction creates a new extraction snapshot and clears decisions for the previous snapshot.

### Public demo is rate-limited

Wait until the configured rate-limit window resets or use a local non-production environment without `DEMO_RATE_LIMIT_SECRET`.

### Proposales is unavailable

The API route returns an error and no local proposal is treated as successfully created.
