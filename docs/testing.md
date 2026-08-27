# Testing

## Unit tests

pnpm test

Domain and contract behavior is tested without infrastructure.

## Integration tests

pnpm db:up
pnpm test:integration

Repository integration tests use a real PostgreSQL database.

TEST_DATABASE_URL must never point at production.

## Full quality gate

pnpm check

## Browser E2E

Playwright covers three persisted browser flows:

1. create and reload an inquiry;
2. review an inquiry and calculate authoritative deterministic pricing;
3. create and reload a persisted review-ready proposal draft.

Pricing and proposal E2E tests use deterministic PostgreSQL fixtures rather
than requiring a live AI provider call.

Run:

    pnpm test:e2e

## MCP protocol test

A real MCP client starts the stdio server as a subprocess and verifies:

- MCP 2026-07-28 negotiation;
- discovery of all four proposal tools;
- authoritative catalog search;
- rejection of caller-supplied authority fields.

Run:

    pnpm --filter @proposal-agent/mcp test:protocol

## Deterministic quality gate

Run:

    pnpm check

The quality gate runs linting, workspace type checking, unit tests,
PostgreSQL integration tests, and the Next.js production build.

Live AI evaluations remain separate because deterministic CI must not depend
on provider availability, latency, or model variance.

## Continuous integration

GitHub Actions provisions an isolated PostgreSQL service and runs dependency
installation, linting, type checking, unit tests, migrations, integration
tests, production build, Playwright browser E2E, and report upload.
