# Family Connect

A private family app for sharing photos, managing a family tree, and keeping a shared calendar. Built with Next.js, AWS (Cognito, DynamoDB, S3), and designed for use by a single family or demo mode for showcasing.

## Features

- **Photos** – Upload, tag family members, filter by location/person/date, albums, favorites, comments
- **Family tree** – Visualize relationships; add and edit members and relationships (including admin tools)
- **Calendar** – Events, RSVPs, birthdays, and memorials from family data
- **Profiles** – Per-member profiles with hobbies, languages, pets, social links
- **Demo mode** – Isolated demo family and data for sharing the app without exposing real data
- **Auth** – AWS Cognito (User Pools) with optional OAuth

## Tech stack

- **Framework:** Next.js 15 (App Router)
- **Auth:** AWS Cognito (User Pools)
- **Data:** AWS DynamoDB
- **Storage:** AWS S3 (photos)
- **UI:** React, Tailwind CSS, DaisyUI, react-select, FullCalendar

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** (or yarn/pnpm)
- **AWS account** with:
  - Cognito User Pool
  - DynamoDB tables: `Family`, `Photos`, `Albums`, `Relationships`, `Events`, `EventRSVPs`, `HobbyComments`, `Notifications`
  - S3 bucket for photo uploads
  - IAM user or role with access to the above (for API routes and, currently, client-side SDK usage)

## Getting started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd family-connect-app
npm install
```

### 2. Environment variables

Create a `.env.local` in the project root (and/or use your host’s env config). The app expects these variables:

#### Required – AWS & Cognito

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_AWS_PROJECT_REGION` | AWS region (e.g. `us-east-2`) |
| `NEXT_PUBLIC_AWS_USER_POOLS_ID` | Cognito User Pool ID |
| `NEXT_PUBLIC_AWS_USER_POOLS_WEB_CLIENT_ID` | Cognito App client ID |
| `NEXT_PUBLIC_AWS_COGNITO_REGION` | Same as project region if not set |
| `NEXT_PUBLIC_AWS_COGNITO_DOMAIN` | Cognito Hosted UI domain (e.g. `your-domain.auth.us-east-2.amazoncognito.com`) |
| `NEXT_PUBLIC_AWS_ACCESS_KEY_ID` | IAM access key (used by API routes and current client-side AWS usage) |
| `NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY` | IAM secret key |
| `NEXT_PUBLIC_AWS_S3_BUCKET_NAME` | S3 bucket name for photos |

#### Optional – OAuth redirects (default: localhost)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_AWS_REDIRECT_SIGNIN` | Redirect URI after sign-in (e.g. `https://yourdomain.com`) |
| `NEXT_PUBLIC_AWS_REDIRECT_SIGNOUT` | Redirect URI after sign-out |

#### Optional – Demo mode

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_DEMO_USER_IDS` | Comma-separated Cognito user IDs for demo users |
| `NEXT_PUBLIC_DEMO_USERNAME` | Demo login username (shown on login page) |
| `NEXT_PUBLIC_DEMO_PASSWORD` | Demo login password |

See [DEMO_SETUP.md](./DEMO_SETUP.md) for full demo configuration.

#### Optional – Contact form (EmailJS)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` | EmailJS public key |
| `NEXT_PUBLIC_EMAILJS_SERVICE_ID` | EmailJS service ID |
| `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID` | EmailJS template ID |

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with a Cognito user (or demo credentials if configured).

### 4. Build for production

```bash
npm run build
npm start
```

## Deployment

### Vercel

1. Connect the repo in [Vercel](https://vercel.com).
2. Add all required environment variables (and optional ones as needed) in Project → Settings → Environment Variables.
3. Deploy; the default `next build` is used (see `vercel.json`).

**Important:** Set `NEXT_PUBLIC_AWS_REDIRECT_SIGNIN` and `NEXT_PUBLIC_AWS_REDIRECT_SIGNOUT` to your production URL and add that URL to the Cognito App Client’s allowed callback/sign-out URLs.

### AWS Amplify (Hosting)

The repo includes `amplify.yml` for Amplify’s build:

- **Pre-build:** `npm install --legacy-peer-deps`
- **Build:** Env vars with `NEXT_PUBLIC_` are written to `.env.production`, then `npm run build`
- **Artifacts:** `.next` (Next.js output)

In Amplify Console, add the same environment variables as above. Ensure your production redirect URIs are set in Cognito and in `NEXT_PUBLIC_AWS_REDIRECT_*`.

## Project structure (overview)

| Path | Purpose |
|------|--------|
| `app/` | Next.js App Router pages and API routes |
| `app/api/photos/` | Photos API (authenticated, DynamoDB + S3 signed URLs) |
| `app/api/upload/` | Photo upload API (authenticated, S3) |
| `components/` | React UI components |
| `context/` | Auth, user, calendar, toast contexts |
| `hooks/` | Data hooks (e.g. `dynamoDB.tsx` for DynamoDB/S3) |
| `utils/` | Helpers (auth, API client, demo config) |

## Documentation

- **[DEMO_SETUP.md](./DEMO_SETUP.md)** – Configure demo users and demo family data.
- **[RECOMMENDATIONS.md](./RECOMMENDATIONS.md)** – Design and implementation notes.
- **[REVIEW_UPDATE.md](./REVIEW_UPDATE.md)** – Current status and remaining improvements (security, performance, UX).
- **[SECURITY_AUTH_UPDATE.md](./SECURITY_AUTH_UPDATE.md)** – API authentication and security notes.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (default port 3000) |
| `npm run build` | Production build |
| `npm start` | Run production server (after `build`) |
| `npm run lint` | Run ESLint |

## Notes

- **Admin:** Admin features are currently gated by a hardcoded user ID in several files. See REVIEW_UPDATE.md for moving this to config or a proper role.
- **AWS credentials:** The app currently uses `NEXT_PUBLIC_*` AWS keys in both API routes and client-side code. For production, credentials should be server-only and all AWS access should go through API routes; see REVIEW_UPDATE.md.
- **DynamoDB:** Tables are used via the AWS SDK (Scan/Query/GetItem, etc.). GSIs are recommended for scaling; see RECOMMENDATIONS.md.

## License

Private / family use. Adjust as needed for your case.
