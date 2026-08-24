# ADR-0003: Web composes use cases instead of owning business logic

## Status

Accepted

## Context

The first product slice must accept customer inquiry text, persist it,
and load it back into the web application.

The implementation must not couple React or Next.js directly to SQL.

## Decision

The web application validates external input using
`@proposal-agent/contracts`.

The web application invokes use cases owned by
`@proposal-agent/application`.

The application layer depends on the `InquiryRepository` port.

`@proposal-agent/db` implements that port with PostgreSQL.

Database composition is server-only.

## Data flow

Form
-> Server Action
-> contract validation
-> CreateInquiry
-> InquiryRepository
-> PostgreSQL
-> redirect
-> GetInquiry
-> InquiryRepository
-> rendered Server Component

## Consequences

React components do not execute SQL.

Application use cases can be unit tested without PostgreSQL.

PostgreSQL remains integration-tested separately.

Future AI extraction can consume persisted inquiries without
bypassing the application boundary.
