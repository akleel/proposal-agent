# Proposal Agent

[![CI](https://github.com/akleel/proposal-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/akleel/proposal-agent/actions/workflows/ci.yml)

> From messy customer inquiry to review-ready proposal.

Proposal Agent is a production-minded proposal automation project for turning unstructured customer inquiries into structured, reviewable proposal workflows.

The central engineering principle is:

> **AI interprets information. Deterministic application and domain code owns authority.**

AI may help interpret customer intent, but it must not own catalog prices, pricing calculations, persistence authority, or final proposal state.

## Current status

The first persisted vertical slice is complete:

- Create an inquiry in the Next.js UI.
- Validate external input with Zod.
- Execute application-layer use cases.
- Persist the inquiry through an application-owned repository port.
- Store and retrieve data from PostgreSQL.
- Render persisted inquiries through a dynamic Next.js route.
- Verify repository behavior against a real PostgreSQL database.
- Run linting, type checking, tests, migrations, and production builds.

The browser flow has been manually verified across page reloads.

AI functionality is intentionally planned after browser E2E coverage.

## Architecture

```text
Browser
  |
  v
apps/web
  |
  +--> packages/contracts
  |
  +--> packages/application --> packages/domain
  |
  +--> packages/db ----------> PostgreSQL
           |
           +--> application ports
           +--> domain types
```

### Package responsibilities

| Package | Responsibility |
| --- | --- |
| `apps/web` | Next.js, React, server actions, presentation and composition |
| `packages/application` | Use cases and application-owned ports |
| `packages/domain` | Deterministic business concepts and rules |
| `packages/contracts` | Runtime validation for external boundaries |
| `packages/db` | PostgreSQL pool, migrations, repositories and persistence mapping |

The application layer does not depend on Next.js, PostgreSQL, or AI providers.

The domain layer does not depend on infrastructure.

## Tech stack

- TypeScript
- Next.js 16
- React 19
- PostgreSQL 18
- pnpm workspaces
- Zod
- Vitest
- Docker Compose
- GitHub Actions

Planned:

- Playwright browser E2E tests
- structured AI extraction
- deterministic pricing and proposal workflows
- MCP tool boundaries where they provide clear product value

## Repository structure

```text
proposal-agent/
|-- apps/
|   `-- web/
|-- packages/
|   |-- application/
|   |-- contracts/
|   |-- db/
|   `-- domain/
|-- docs/
|-- .github/workflows/
|-- compose.yaml
|-- pnpm-workspace.yaml
`-- package.json
```

## Local development

Requirements:

- Node.js 24
- pnpm 11
- Docker with Docker Compose

Install dependencies:

```bash
pnpm install
```

Copy the local environment configuration:

```bash
cp .env.example .env
```

Start PostgreSQL and apply migrations:

```bash
pnpm db:up
pnpm db:migrate
```

Start the web application:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Quality gates

Run the complete local quality gate:

```bash
pnpm check
```

It currently runs:

1. ESLint
2. TypeScript type checking
3. unit tests
4. PostgreSQL integration tests
5. Next.js production build

GitHub Actions runs the equivalent checks against an isolated PostgreSQL service.

## Database migrations

Migrations are explicit and are never run automatically when the application starts.

Applied migrations are tracked with checksums and treated as immutable.

## Engineering documentation

- [Architecture](docs/architecture.md)
- [Testing strategy](docs/testing.md)
- [Database runbook](docs/runbook.md)
- [ADR 0001 - Domain boundaries](docs/decisions/0001-domain-boundaries.md)
- [ADR 0002 - Persistence boundary](docs/decisions/0002-persistence-boundary.md)
- [ADR 0003 - Web/application composition](docs/decisions/0003-web-application-composition.md)

## Roadmap

1. Add Playwright E2E coverage for the persisted inquiry flow.
2. Add structured AI inquiry extraction with source and confidence metadata.
3. Add deterministic catalog, pricing and proposal lifecycle rules.
4. Add human review before authoritative proposal state changes.
5. Introduce MCP tools only where they create a useful and auditable boundary.
