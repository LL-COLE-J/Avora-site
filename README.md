# Avora

Avora is the NowySystems event-operations product. Pink Gala 2027 is its first production deployment and check-in is its first focused workflow.

## Product boundaries

- **Avora** owns reusable event-platform architecture, models, modules, and product code.
- **Pink Gala 2027** is Avora's first branded implementation and proving ground.
- **NowySystems Brain** owns reusable standards, decisions, and validated lessons.
- **PINKGALA2026** and **pg-auction** remain historical references outside this active codebase.

## Current milestone

The repository starts with a synthetic staff check-in review at `/design/avora/check-in`, foundational event/guest/party/table/staff/audit contracts, and automated quality gates.

```bash
npm install
npm run dev
```

Before a change is accepted, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` must pass.

Live guest data, Firebase resources, deployments, and historical repositories remain disconnected.
