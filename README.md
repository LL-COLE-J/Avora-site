# Avora

Avora is the canonical event-platform product from NowySystems.

## Current focus

Pink Gala 2027 is Avora's first production deployment. The active product scope is a premium, staff-facing guest check-in experience. Auction functionality is not part of the 2027 release.

The previous static Firebase prototype has been removed from the active tree. Its full implementation remains recoverable through this repository's Git history.

## Product boundaries

- **Avora** — reusable event-platform architecture, models, modules, and product code.
- **Pink Gala 2027** — the first branded Avora implementation and proving ground.
- **NowySystems Brain (NSB)** — reusable standards, design systems, workflows, decisions, and validated lessons.
- **PINKGALA2026** — historical workflow reference.
- **pg-auction** — historical implementation pending separately authorized security cleanup and archival.

## Guardrails

- Build around real event-day workflows, not a generic dashboard.
- Use synthetic guest data for design and rehearsal before connecting live data.
- Keep consequential corrections visible, reversible, and auditable.
- Design for phones and tablets, weak networks, exceptions, and reconciliation.
- Preserve clean extension points for future Avora modules without shipping unused features.
- Promote validated reusable patterns back into NSB.

## Next milestone

Define the foundational event, guest, party, seating, staff, check-in, and audit models, then build the first synthetic Pink Gala 2027 check-in journey.

Live guest data, Firebase resources, deployments, and historical repositories are outside this reset.
