# TurfTitans Folder Structure

```text
TurfTournaments/
  package.json
  next.config.ts
  tailwind.config.ts
  postcss.config.mjs
  tsconfig.json
  next-env.d.ts
  middleware.ts
  supabase/
    schema.sql
    migrations/
      0002_auth_profile_trigger.sql
  docs/
    folder-structure.md
  public/
    manifest.json
    icons/
      .gitkeep
  src/
    app/
      (auth)/
        login/
        sign-up/
        forgot-password/
        reset-password/
      (dashboard)/
        dashboard/
        profile/
        tournaments/
          create/
          [tournamentId]/
            edit/
            registrations/
            payments/
            auction/
            teams/
            export/
      auth/
        callback/
      api/
        tournaments/
        registrations/
        payments/
        auction/
        exports/
      layout.tsx
      page.tsx
      globals.css
    components/
      auction/
      auth/
      dashboard/
      exports/
      payments/
      teams/
      tournaments/
      ui/
    lib/
      env.ts
      supabase/
        browser.ts
        middleware.ts
        server.ts
      validations/
        auth.ts
      exports/
      utils/
        cn.ts
    types/
      database.ts
      index.ts
```

## Routing Plan

- `/` - Tournament discovery and search.
- `/login` - Login.
- `/sign-up` - Account creation.
- `/forgot-password` - Password reset.
- `/reset-password` - New password form after Supabase recovery callback.
- `/auth/callback` - Supabase email confirmation and password recovery callback.
- `/dashboard` - User home with created and joined tournaments.
- `/profile` - User profile.
- `/tournaments/create` - Create tournament.
- `/tournaments/[tournamentId]` - View tournament.
- `/tournaments/[tournamentId]/edit` - Edit tournament.
- `/tournaments/[tournamentId]/registrations` - Registration dashboard.
- `/tournaments/[tournamentId]/payments` - Payment approval queue.
- `/tournaments/[tournamentId]/auction` - Auction console.
- `/tournaments/[tournamentId]/teams` - Team budgets and rosters.
- `/tournaments/[tournamentId]/export` - PDF and Excel exports.
