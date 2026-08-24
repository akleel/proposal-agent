# Architecture

## Goal

Proposal Agent turns unstructured customer inquiries into review-ready proposal drafts.

Business-critical behavior remains deterministic.

## Dependency direction

apps/web -> application -> domain

db -> application ports
db -> domain

domain must never depend on infrastructure.

## apps/web

Owns HTTP, Next.js, React, presentation and composition.

## application

Owns application use cases and ports such as repository interfaces.

It may depend on domain.

It must not depend on PostgreSQL, Next.js or AI providers.

## domain

Owns deterministic business concepts and business rules.

It must not depend on Next.js, PostgreSQL, AI SDK or MCP.

## contracts

Owns runtime validation for external boundaries.

## db

Owns PostgreSQL connection management, migrations, repositories and persistence mapping.

It implements application-owned ports.

It must not define business policy.

## Core rule

AI interprets information.

Deterministic application and domain code owns authority.
