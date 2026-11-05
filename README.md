# Imagine AI (A-Star Technologies)

Next.js app with PWA support, MongoDB-backed user accounts, and email/password sign-in via NextAuth.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy the example file and edit it with your values:

```bash
cp .env.example .env.local
```

See [Environment variables](#environment-variables) below for what each variable does.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Other scripts:

- `npm run dev:https` — local dev over HTTPS (useful for testing PWA features)
- `npm run build` / `npm run start` — production build and server
- `npm run lint` — ESLint
- `npm test` / `npm run test:watch` — unit tests (Vitest)

## Environment variables

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `MONGODB_URI` | Yes (for auth) | MongoDB connection string. User records are stored in the database named by `MONGODB_DB` (or `imagine-ai` by default). |
| `MONGODB_DB` | No | MongoDB database name. Defaults to `imagine-ai` when omitted. |
| `NEXTAUTH_SECRET` | Yes in production | Secret for signing NextAuth session tokens and encrypting cookies. Generate with `openssl rand -base64 32`. |
| `AUTH_SECRET` | Alternative to above | Same purpose as `NEXTAUTH_SECRET`; the app uses whichever is set (`NEXTAUTH_SECRET` first, then `AUTH_SECRET`). You only need one. |
| `NEXTAUTH_URL` | Yes in production | Public URL of the app (e.g. `http://localhost:3000` locally, or your Vercel/production URL). Used for NextAuth callbacks. |

Local development typically needs at least `MONGODB_URI` and `NEXTAUTH_URL`. Set `NEXTAUTH_SECRET` (or `AUTH_SECRET`) before deploying so sessions are signed with a strong secret.

The canonical template lives in [`.env.example`](.env.example).

## Features

- **PWA** — Web app manifest, service worker (Serwist), and offline fallback page
- **Auth** — Create an account at `/sign-up` and sign in at `/sign-in`; users are persisted in MongoDB

## Project structure (high level)

- `src/app/` — App Router pages and API routes (including `/api/auth/[...nextauth]`)
- `src/lib/` — MongoDB client, user helpers, NextAuth configuration
- `public/icons/` — PWA icons

## Deploy on Vercel

Set the same environment variables in your Vercel project settings. Use your production URL for `NEXTAUTH_URL` and a generated secret for `NEXTAUTH_SECRET`.

See [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
