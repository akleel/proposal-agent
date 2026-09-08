# ADR-0002: Persistence is an infrastructure adapter

## Status

Accepted

## Context

Application use cases need persistence without depending directly on PostgreSQL.

## Decision

Repository interfaces are owned by `@proposal-agent/application`.

`@proposal-agent/db` implements those interfaces using PostgreSQL.

The domain does not depend on database libraries or SQL.

Migrations are explicit SQL files and are never executed automatically when the web server starts.

Applied migrations are checksum protected.

## Consequences

PostgreSQL can be replaced without rewriting domain rules.

Database integration can be tested against a real PostgreSQL instance independently from domain and application tests.

Modified historical migrations fail instead of silently diverging.
