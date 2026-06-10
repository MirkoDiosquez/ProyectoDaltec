<!--
  SYNC IMPACT REPORT
  Version change: (new) → 1.0.0
  Added sections: Core Principles (11 principles), Governance
  Removed sections: N/A (initial encoding)
  Templates requiring updates:
    ✅ plan-template.md — Constitution Check gates reference updated principles
    ✅ spec-template.md — No structural changes required; principles are compatible
    ✅ tasks-template.md — Observability, security, and config tasks align with P8/P6/P11
  Follow-up TODOs:
    TODO(RATIFICATION_DATE): Confirm the original project adoption date with the team.
-->

# ProyectoDaltec Constitution

## Core Principles

### I. Stack Tecnológico Obligatorio

The system MUST use exclusively the following base technologies:

**Backend**: Django (WSGI) as the primary framework; Django Channels for async
functionality, WebSockets, and real-time communication.

**Frontend**: React as the UI framework.

**Web Server**: Nginx as reverse proxy and production web server.

**Persistence & Cache**: MySQL as the primary relational database; Redis for
cache, sessions, queues, and Django Channels support.

*Rationale*: A fixed, well-understood stack reduces onboarding friction, enables
shared infrastructure tooling, and ensures all team members can reason about
every layer of the system.

### II. Prohibición de Hardcode

No hardcoded information is permitted inside source code.

All configuration MUST originate from: environment variables, configuration
files, the database, or centralized configuration services.

This includes but is not limited to: URLs, credentials, tokens, API keys,
ports, IP addresses, business limits, monetary values, configurable roles and
permissions, and feature flags.

*Rationale*: Hardcoded values create security risks, impede deployments across
environments, and couple business logic to release cycles.

### III. Separación de Responsabilidades

The application MUST maintain a clear separation between:

- **Presentation**: React
- **Business logic**: Django
- **Persistence**: MySQL
- **Cache & messaging**: Redis

Critical business logic MUST NOT reside in the frontend.

*Rationale*: Layered separation enables independent testing, scaling, and
replacement of each tier without cascading changes.

### IV. Diseño API First

All functionality MUST be exposed via defined and documented APIs before being
consumed by the frontend.

The React frontend MUST communicate exclusively through official backend APIs.

*Rationale*: API-first enables parallel frontend/backend development, enforces
clear contracts, and makes the system consumable by future clients (mobile,
third-party integrations).

### V. Escalabilidad

Every new feature MUST be designed considering:

- Horizontal scalability.
- Asynchronous processing where appropriate.
- Compatibility with multiple backend instances.
- Shared Redis usage for inter-node synchronization.

*Rationale*: Designing for scale from the start avoids costly re-architectures
and ensures the system can grow with demand without breaking changes.

### VI. Seguridad

The following security measures are MANDATORY:

- HTTPS in production.
- CSRF protection.
- Server-side data validation in the backend.
- Secure secrets management via environment variables.
- Principle of least privilege for users and services.
- Use JWT for Authentication.

*Rationale*: Security must be baked in, not bolted on. These controls address
the most common attack vectors and are non-negotiable from day one.

### VII. Calidad del Código

All development MUST:

- Follow SOLID principles.
- Avoid code duplication (DRY).
- Maintain high cohesion and low coupling.
- Include typing where possible.
- Be maintainable and extensible.

*Rationale*: Code quality directly impacts long-term velocity. Technical debt
accumulated through poor quality compounds and eventually blocks delivery.

### VIII. Observabilidad

The system MUST incorporate:

- Structured logging.
- Error recording.
- Operational metrics.
- Traceability of critical actions.

*Rationale*: Without observability, diagnosing production incidents is
guesswork. Structured data enables alerting, auditing, and performance analysis.

### IX. Compatibilidad de Infraestructura

The official project infrastructure consists of: Nginx, Django (WSGI),
Django Channels, MySQL, Redis, React.

Any proposal to replace or incorporate equivalent technologies REQUIRES explicit
architectural approval.

*Rationale*: Uncontrolled technology sprawl increases operational complexity and
training costs. Approvals ensure alignment and documented trade-off analysis.

### X. Regla Suprema

When facing any technical decision, priorities MUST be applied in this order:

1. Maintainability
2. Security
3. Scalability
4. Simplicity
5. Performance

No implementation MAY violate the principles defined in this constitution.

*Rationale*: A clear priority order removes ambiguity in trade-off discussions
and prevents short-term optimizations from undermining long-term system health.

### XI. Configuración Dinámica del Negocio

Any functionality, parameter, or behavior that may change by business decision
MUST be stored outside the source code.

Business configurations MUST be managed via: database, environment variables,
configuration files, or authorized administrative panels.

Hardcoding is PROHIBITED for: modifiable business rules, operational limits,
rates/prices/commissions, configurable states, option catalogs, validation
parameters subject to change, integration configurations, feature flags, and
client or tenant configurations.

*Rationale*: Business rules change faster than release cycles. Externalizing
them allows non-developer stakeholders to adjust behavior without deployments,
reducing bottlenecks and risk.

## Governance

This constitution supersedes all other practices and documentation in matters
of technical principle and architecture.

**Amendment procedure**:
1. Propose the change in writing with rationale and impact analysis.
2. Obtain explicit approval from the architecture lead.
3. Update this file, increment the version following semantic versioning rules,
   and update `LAST_AMENDED_DATE`.
4. Propagate changes to affected templates and runtime guidance docs.
5. Communicate the amendment to the full team before merging.

**Versioning policy**:
- MAJOR: Backward-incompatible governance changes, principle removals, or
  redefinitions that invalidate prior decisions.
- MINOR: New principle or section added, or materially expanded guidance.
- PATCH: Clarifications, wording fixes, non-semantic refinements.

**Compliance review**:
All pull requests MUST include a Constitution Check section in the plan
verifying compliance with relevant principles before Phase 0 research begins.
Re-check is required after Phase 1 design.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): Confirm with team | **Last Amended**: 2026-06-10
