# Avora product boundaries

## Source of truth

- **Avora-site** owns reusable event-platform code, domain models, and the Pink Gala 2027 implementation.
- **Pink Gala 2027** is a branded configuration and proving ground inside Avora, not a separate product.
- **NowySystems Brain** owns reusable standards, validated patterns, project state, and cross-project lessons.
- **PINKGALA2026** is a historical workflow reference only.
- **pg-auction** is a historical implementation pending separately authorized security cleanup and archival.

## Active scope

The 2027 release is a premium staff-facing check-in product. It includes the guest arrival workflow and the operational support required to run it safely. It does not ship auction, bidding, donation, ticketing, payment, or broad multi-tenant administration surfaces.

## Architecture rules

1. Domain logic does not import Firebase or UI code.
2. Synthetic fixtures implement the same domain contracts future data adapters will return.
3. Event-specific theme and copy remain separate from reusable workflow logic.
4. Consequential actions must become reversible, attributable audit events before production data is connected.
5. Planning and live-operation surfaces remain distinct.
