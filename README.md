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

## Cloudflare deployment

The synthetic check-in milestone is exported as a static Next.js site for the existing Cloudflare Pages project. `npm run build:cloudflare` writes the deployable site to `.open-next/assets`, preserving the project's current output-directory setting while serving real HTML routes instead of an unbound Worker bundle.

Move Avora to Cloudflare Workers only when a server-side requirement is introduced. Secrets and environment-specific values belong in Cloudflare, never in Git.

Live guest data, Firebase resources, deployments, and historical repositories remain disconnected.
