# ADR-0003: Web composes use cases instead of owning business logic

## Status

Accepted

## Context

The web application must support the customer inquiry workflow without coupling React or Next.js directly to PostgreSQL, Gemini, or domain business rules.

The current workflow includes inquiry creation, AI extraction, human review, resolved inquiry state, Proposales catalog matching, and proposal creation.

## Decision

The web application validates serialized user input at its boundaries.

The web application invokes use cases owned by `@proposal-agent/application` for inquiry and review workflows.

Application-layer repository and extractor ports keep use cases independent from PostgreSQL and Gemini implementations.

`@proposal-agent/db` implements persistence ports with PostgreSQL.

Server-only composition wires application use cases to infrastructure implementations.

Proposales-specific HTTP integration remains in the web server layer and does not move commercial authority into the domain or AI layer.

## Data flow

```text
Browser
-> Next.js Server Action / Route Handler
-> boundary validation
-> application use case
-> domain rules
-> persistence / AI adapter as needed
-> reviewed ResolvedInquiry
-> Proposales server integration
```

For inquiry creation specifically:

```text
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
```

## Consequences

React components do not execute SQL.

Application use cases can be unit tested without PostgreSQL or Gemini.

PostgreSQL remains integration-tested separately.

AI extraction and human review operate through application boundaries rather than bypassing them.

Proposales proposal creation remains server-side and consumes reviewed/validated application state.
