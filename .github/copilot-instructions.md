---
description: "Workspace instructions for Health One Dental Clinic (Next.js frontend + NestJS backend)"
---

# Health One Workspace Instructions

## Project overview
- Frontend: Next.js 16 app in the repository root.
- Backend: NestJS service under `backend/`.
- Database: MongoDB via environment configuration.
- Image storage: Cloudinary.

## Key directories
- `app/` — Next.js App Router pages, route handlers, and layouts.
- `components/` — reusable UI components and application widgets.
- `lib/` — frontend utilities, API client, auth helpers, Cloudinary helpers, data models.
- `backend/` — NestJS server implementation, including modules, schemas, configs, and backend-specific tooling.
- `styles/` — global CSS.
- `public/` — static assets.

## Important commands
### Frontend (root)
- `npm install` — install frontend dependencies.
- `npm run dev` — run Next.js in development on `http://localhost:3000`.
- `npm run build` — build the frontend.
- `npm run start` — run the production build.
- `npm run lint` — ESLint check across the repository.

### Backend (`backend/`)
- `cd backend && npm install` — install backend dependencies.
- `cd backend && npm run start:dev` — start NestJS in watch mode.
- `cd backend && npm run build` — build the backend.
- `cd backend && npm run lint` — lint backend TypeScript.
- `cd backend && npm run test` — run backend tests.

## Development notes
- This is not a single-package monorepo: the frontend and backend each have their own `package.json` and commands.
- Most API work is in `backend/src/`; frontend API routes are under `app/api/` for client-side integration and server-side route handling.
- Use `backend/package.json` for backend tasks and `package.json` in the repo root for frontend tasks.
- Environment variables are configured separately for frontend and backend. Check `.env.example`, `backend/.env.example`, and the docs in `SETUP.md`.

## Documentation to consult first
- `README.md`
- `SETUP.md`
- `BACKEND_SUMMARY.md`
- `API_ROUTES.md`
- `WORKFLOW_GUIDE.md`
- `DEPLOYMENT.md`
- `backend/README.md`
- `CLOUDINARY_SETUP.md`
- `MONGODB_SETUP.md`

## Agent guidance
- Prefer package versions from `package.json` rather than prose in docs when there is a version mismatch.
- When asked to modify backend behavior, edit `backend/src/` and use backend scripts.
- When asked to change UI, edit `app/`, `components/`, `lib/`, or `styles/`.
- Keep frontend routing conventions aligned with Next.js App Router and `app/api/` route handlers.
- Preserve the separation between frontend and backend responsibilities.

## Known context
- `README.md` contains a broader product overview and quick-start instructions.
- `SETUP.md` contains detailed local development setup steps.
- The backend is a NestJS app using MongoDB, JWT auth, and Cloudinary.
- The frontend is a Next.js app using React 19, Tailwind CSS v4, shadcn/ui components, and JWT-based authentication.
