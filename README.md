# TurfTitans

TurfTitans is a full-stack web app for auction-based cricket tournaments. It supports tournament creation, player registration, payment review, auction workflows, team budgets, exports, Supabase Auth, and PWA installation.

## Current Milestone

Milestone 2 implements Supabase authentication, protected routes, auth pages, logout, and the authenticated dashboard/profile shell.

## Setup

1. Create a Supabase project.
2. Open the Supabase SQL editor and run `supabase/schema.sql`.
   - If you already ran the Milestone 1 schema, run `supabase/migrations/0002_auth_profile_trigger.sql` as well.
3. Copy `.env.example` to `.env.local`.
4. Add your Supabase URL, anon key, and service role key.
5. In Supabase Auth settings, set the Site URL to `http://localhost:3000` for local development and add these redirect URLs:

```text
http://localhost:3000/auth/callback
http://localhost:3000/reset-password
```

6. Install dependencies:

```bash
npm install
```

7. Start the app:

```bash
npm run dev
```

## Authentication

Implemented routes:

- `/sign-up` - full name, email, phone, password.
- `/login` - email and password login.
- `/forgot-password` - sends Supabase recovery email.
- `/reset-password` - sets a new password after recovery.
- `/auth/callback` - exchanges Supabase email confirmation and recovery codes.
- `/dashboard` - protected authenticated dashboard.
- `/profile` - protected user profile.

Protected route enforcement is handled by `middleware.ts` and the dashboard route group layout.

## Database

The schema includes:

- `profiles`
- `tournaments`
- `registrations`
- `payments`
- `teams`
- `auction_purchases`

It also includes enums, indexes, update triggers, budget safety triggers, Supabase Storage buckets, and Row Level Security policies.

## Product Rules Captured

- Every authenticated user has the same account type.
- A user may create one tournament.
- A user may join tournaments created by other users.
- Players become approved participants only after payment approval.
- Team spending is tracked through auction purchases.
- Overspending is blocked at the database level.
