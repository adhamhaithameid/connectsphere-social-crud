# ConnectSphere - Social Media CRUD Platform

A full-stack social media application built for internship evaluation.

It supports complete CRUD workflows for:
- Profiles
- Posts
- Interactions (likes, comments, shares)

## Tech Stack

- Frontend: React 19, TypeScript, Vite, TanStack Query, React Hook Form
- Backend: Node.js, Express, TypeScript, Zod validation
- Data Store: JSON file persistence (`apps/api/data/db.json`) for zero-friction setup
- Package manager: pnpm workspaces

## Project Structure

```text
apps/
  api/   # Express REST API
  web/   # React frontend
```

## Features

- Create, read, update, and delete user profiles
- Create, read, update, and delete posts with visibility levels
- Create, read, update, and delete interactions (LIKE, COMMENT, SHARE)
- Search and pagination across profile/post/interaction lists
- Live dashboard metrics (totals + interaction breakdown)
- Seeded demo data for instant review

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Seed demo data

```bash
pnpm seed
```

### 3. Run frontend + backend

```bash
pnpm dev
```

- API: `http://localhost:4000`
- Web: `http://localhost:5173`

## Scripts

- `pnpm dev` - run API + web in parallel
- `pnpm seed` - reset and seed demo data
- `pnpm typecheck` - TypeScript checks for all workspaces
- `pnpm lint` - lint all workspaces
- `pnpm build` - production build for all workspaces

## API Endpoints

### Health
- `GET /health`

### Feed
- `GET /api/feed/overview`

### Profiles
- `GET /api/profiles`
- `GET /api/profiles/:id`
- `POST /api/profiles`
- `PATCH /api/profiles/:id`
- `DELETE /api/profiles/:id`

### Posts
- `GET /api/posts`
- `GET /api/posts/:id`
- `POST /api/posts`
- `PATCH /api/posts/:id`
- `DELETE /api/posts/:id`

### Interactions
- `GET /api/interactions`
- `POST /api/interactions`
- `PATCH /api/interactions/:id`
- `DELETE /api/interactions/:id`

## Environment Variables

### API (`apps/api/.env`)

```env
PORT=4000
```

### Web (`apps/web/.env`)

```env
VITE_API_URL="http://localhost:4000"
```

## Notes

- This project uses a file-backed datastore to keep setup simple for reviewers.
- Data persists in `apps/api/data/db.json`.
- Running `pnpm seed` resets this data file with curated sample records.
