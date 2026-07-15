# Asset Manager

A small SaaS-style app for managing assets: create, edit, and delete assets with a name and description. Built Docker-first with Next.js (App Router, TypeScript), Prisma, and Postgres.

## Prerequisites

- Docker and Docker Compose

## Getting started

```bash
cp .env.example .env   # adjust credentials if desired
docker compose up --build
```

Then open [http://localhost:3000](http://localhost:3000).

Source code is bind-mounted into the `app` container, so edits on the host are picked up by Next.js Fast Refresh without rebuilding the image.

## Database migrations

Migrations run inside the `app` container so `db` resolves via the Docker network:

```bash
docker compose run --rm app npx prisma migrate dev --name <migration-name>
```

## Tests

Unit and component tests (Vitest + React Testing Library) run against the business logic (`src/lib`) and UI components (`src/components`), independent of the Docker stack:

```bash
npm install
npm run test           # run once
npm run test:watch     # watch mode
npm run test:coverage  # with coverage report (100% required on src/lib and src/components)
```

## Project structure

- `src/lib/asset-schema.ts` — input validation for asset create/update
- `src/lib/actions.ts` — Server Actions: create, update, delete
- `src/lib/assets.ts` — read queries (list, get by id)
- `src/lib/prisma.ts` — Prisma Client singleton (Postgres via `@prisma/adapter-pg`)
- `src/components/` — `AssetTable`, `AssetForm`, `DeleteAssetButton`
- `src/app/assets/` — list, create, and edit pages
- `prisma/schema.prisma` — the `Asset` data model
