# Gradmire

**Study abroad, organized by subject — not by flag.**

Course-first study-abroad platform. V1 covers the **United Kingdom**; the US,
Canada and Australia render as coming-soon destinations.

**Live:** [gradmire.vercel.app](https://gradmire.vercel.app)

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19 |
| Styling | Tailwind CSS, design tokens in `globals.css` |
| Database | Supabase Postgres, accessed with Drizzle ORM |
| Auth | Supabase Auth, passwordless magic link |
| Hosting | Vercel |

## Getting started

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard)
   (region closest to your users; save the database password).
2. **Project Settings → API** gives `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
3. **Project Settings → Database → Connection string → URI** gives the
   Postgres URLs. Use the *Transaction pooler* (port 6543) for `DATABASE_URL`
   and the *Session pooler / direct* (port 5432) for `DIRECT_URL`.
4. **Authentication → URL Configuration**: set Site URL to
   `http://localhost:3000` and add `http://localhost:3000/auth/callback` to
   Redirect URLs (add the production origin too, when there is one).
5. **Authentication → Providers → Email**: enable it, leave "Confirm email"
   on, and turn *off* "Allow new users to sign up" — applicants are created
   by a counselor, and the sign-in form passes `shouldCreateUser: false`.

Then:

```bash
npm install
cp .env.example .env.local     # fill in Supabase + Postgres values from above
npm run db:migrate
npm run db:seed
psql "$DIRECT_URL" -f drizzle/rls.sql   # row-level security, once
npm run dev                             # http://localhost:3000
```

To make yourself staff, insert a row into `staff` with your email and set the
matching auth user's `app_metadata.gradmire_role` to `admin` (Authentication →
Users → the user → metadata). Middleware checks the claim; `requireStaff()`
re-checks the `staff` table, so both must agree.

### Auth is optional

Supabase gates only the applicant portal and the staff admin. When the keys
are absent the app does **not** crash: `isSupabaseConfigured()` makes every
visitor anonymous, middleware refuses `/portal` and `/admin` with
`?error=auth_unavailable`, and the rest of the site serves normally. A
misconfigured deploy therefore degrades to a read-only marketing site rather
than a 500 on every route.

`DATABASE_URL`, by contrast, is genuinely required — there is no content
without it.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Production build (type + lint errors fail it) |
| `npm test` | Run the test suite once (`npm run test:watch` to watch) |
| `npm run db:generate` | Generate a migration from `src/db/schema.ts` |
| `npm run db:migrate` | Apply generated migrations (use this) |
| `npm run db:push` | Push the schema directly, without a migration (dev only) |
| `npm run db:seed` | Seed destinations and course hubs (idempotent) |
| `npm run db:studio` | Browse data in Drizzle Studio |
| `npm run verify:schema` | Apply migrations to in-process Postgres and assert relations |
| `npm run verify:redirect` | Assert the auth `next` parameter cannot redirect off-origin |

## Architecture

```
src/
├── app/
│   ├── page.tsx                       Homepage — departures board hero
│   ├── [country]/                     Destination; coming-soon if not live
│   │   └── courses/[slug]/            Course hub (ISR, 1h)
│   ├── tools/                         Finder, ROI, Comparator, Deadlines
│   ├── portal/                        Applicant status view (auth)
│   ├── admin/                         Staff: leads, applications, content
│   └── auth/callback/                 Magic-link exchange
├── components/brand/                  Departure board, boarding pass, chrome
├── db/schema.ts                       Drizzle schema — 10 tables
└── lib/
    ├── queries.ts                     Cached content reads (tagged)
    ├── actions/                       Server actions (forms, admin writes)
    └── rate-limit.ts                  Fixed-window limiter for public forms
```

### Access control

Two authed areas, both gated in `middleware.ts` and re-checked server-side:

- **`/portal`** — an applicant signs in with a magic link and sees the status
  of their own applications. Read-only.
- **`/admin`** — requires a row in `staff`. Manages leads, application stages
  and course content.

Applications are created by staff, not self-served: `signInWithOtp` is called
with `shouldCreateUser: false`, so an unknown email cannot create an account.

The post-login `next` parameter is constrained by `lib/safe-redirect.ts`.
Interpolating it directly is an open redirect — `origin` has no trailing
slash, so `?next=@evil.com` resolves to host `evil.com` and `?next=.evil.com`
to `gradmire.com.evil.com`, both of which authenticate the victim before
handing them to an attacker. `npm run verify:redirect` asserts this stays
closed.

### Caching

Content reads are wrapped in `unstable_cache` under the `content` tag and
served from cache under load. Admin writes call `revalidateTag("content")`, so
edits appear on the next request rather than after the TTL.

### Content provenance

`course_hubs.sources` and `data_verified_at` record where a figure came from
and when it was last checked. **The seeded ranking data is placeholder** — the
original content spec flags it for replacement from a live subject table. The
admin overview surfaces a count of live hubs still carrying unverified figures.

## Known gaps

- Deadline Tracker stores shortlists in `localStorage`; email reminders are not
  built, so the copy does not promise them.
- Five of eight UK subject hubs are stubs pending researched content.
- Transactional email (lead notifications) is not wired; leads land in the
  database and the admin, not an inbox.
