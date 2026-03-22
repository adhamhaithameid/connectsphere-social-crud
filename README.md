# Orbit Social Platform

Orbit is a full-stack social platform demo with complete CRUD flows for profiles, posts, and interactions.

## Tech Stack

- Frontend: React 19, TypeScript, Vite, TanStack Query, React Router
- Backend: Node.js, Express, TypeScript, Zod
- Data layer: JSON persistence in `apps/api/data/db.json`
- Workspace: pnpm monorepo

## Repository Layout

```text
apps/
  api/  # REST API
  web/  # React frontend
```

## Core Features

- Timeline/feed with recent and popular sorting
- Profile, post, and interaction CRUD endpoints
- Inline social actions (like, comment, share)
- Search support on listing endpoints
- Tokenized and normalized search matcher (accent and punctuation tolerant)
- Fixture-driven API search regression tests

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. Seed demo data:

```bash
pnpm seed
```

3. Run the API and web app:

```bash
pnpm dev
```

- API: `http://localhost:4000`
- Web: `http://localhost:5173`

## Workspace Scripts

- `pnpm dev` - run all apps in dev mode
- `pnpm seed` - seed API datastore
- `pnpm crud:smoke` - CRUD smoke script for the API
- `pnpm typecheck` - TypeScript checks for all workspaces
- `pnpm lint` - run workspace lint scripts
- `pnpm build` - production builds

## API Routes

- `GET /health`
- `GET /api/feed/overview`
- `GET|POST /api/profiles`
- `GET|PATCH|DELETE /api/profiles/:id`
- `GET|POST /api/posts`
- `GET|PATCH|DELETE /api/posts/:id`
- `GET|POST /api/interactions`
- `PATCH|DELETE /api/interactions/:id`

## Environment

API (`apps/api/.env`):

```env
PORT=4000
```

Web (`apps/web/.env`):

```env
VITE_API_URL="http://localhost:4000"
```
