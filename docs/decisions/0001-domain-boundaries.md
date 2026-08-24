# ADR-0001: Keep domain independent from infrastructure

## Status

Accepted

## Context

Proposal Agent will use Next.js, PostgreSQL, AI models and MCP.

Business rules must remain independent from those technologies.

## Decision

Business rules live in @proposal-agent/domain.

The domain must not depend on Next.js, React, database clients, AI SDKs or MCP SDKs.

External data is validated through @proposal-agent/contracts.

## Consequences

Business rules can be tested without infrastructure.

AI providers and persistence implementations can change independently.

Cross-layer shortcuts are intentionally disallowed.
