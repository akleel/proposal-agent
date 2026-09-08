# ADR-0001: Keep domain independent from infrastructure

## Status

Accepted

## Context

Proposal Agent uses Next.js, PostgreSQL, Gemini, and the Proposales API.

Business rules must remain independent from those technologies and external providers.

## Decision

Business rules live in `@proposal-agent/domain`.

The domain must not depend on Next.js, React, database clients, AI SDKs, or Proposales SDK/API code.

Serialized and external input is validated at system boundaries. Shared runtime schemas live in `@proposal-agent/contracts`, while infrastructure adapters validate provider-specific data before it enters trusted application/domain logic.

## Consequences

Business rules can be tested without infrastructure.

AI providers, persistence implementations, and external integrations can change independently.

Cross-layer shortcuts are intentionally disallowed.
