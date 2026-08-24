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
