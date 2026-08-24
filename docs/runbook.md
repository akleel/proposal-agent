# Local Database Runbook

## Start PostgreSQL

pnpm db:up

## Apply migrations

pnpm db:migrate

## Run integration tests

pnpm test:integration

## Stop PostgreSQL

pnpm db:down

## Local databases

proposal_agent is used for local development.

proposal_agent_test is used only by integration tests.

Migration files are immutable after application.

Create a new migration instead of modifying an applied migration.
