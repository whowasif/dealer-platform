# Dealer Network Management — Web App (Task 2)

Next.js 14 (App Router) + TypeScript web application implementing **Authentication
& Role-Based Access Control** for the Dealer Network Management System. It connects
to the **existing** PostgreSQL `dealer_platform` database (the schema and seed data
are already loaded — this app does not create tables).

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- `pg` (node-postgres) — database access
- `bcryptjs` — password hashing
- `jose` — JWT session tokens (stored in an httpOnly cookie)
- `zod` — input validation

## Prerequisites

- Node.js v22+ (tested on v22.17.0)
- PostgreSQL 18 running on **port 5433**, database `dealer_platform`, user `postgres`,
  with `01_schema.sql`, `02_seed_geography.sql`, and `03_seed_config.sql` already applied.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example env file and set your real postgres password:

```bash
copy .env.local.example .env.local   # Windows
# or: cp .env.local.example .env.local
```

Then edit `.env.local` and replace `PASSWORD` in `DATABASE_URL` with your actual
postgres password:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5433/dealer_platform
```

A `JWT_SECRET` is already generated in `.env.local`. If you recreate the file, set
your own secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> Note: `.env.local` ships with a generated `JWT_SECRET` and a placeholder DB
> password. You **must** set the real postgres password before seeding or running.

### 3. Seed the initial admin user

The database has no users yet. This script inserts one `super_admin` account:

```bash
npm run seed:admin
```

It is idempotent — running it again updates the password and re-ensures the role.

### 4. Run the dev server

```bash
npm run dev
```

Open **http://localhost:3000** — you'll be redirected to `/login`.

## Default admin login

| Field    | Value              |
| -------- | ------------------ |
| Phone    | `01700000000`      |
| Email    | `admin@example.com`|
| Password | `Admin@123`        |

You can log in with **either** the phone number or the official email plus the password.
Change the password after first login.

## What this app does

- **Login** (`/login`): authenticate by phone or official email + password. On success
  a signed JWT is stored in an httpOnly cookie.
- **Logout**: clears the session cookie.
- **Route protection** (`middleware.ts`): every route except `/login` requires a valid
  session; unauthenticated requests are redirected to `/login`.
- **Role-aware layout**: a sidebar that shows different menu items per role.
- **Dashboard** (`/dashboard`): greets the user; HQ roles see live counts (users,
  representatives, divisions, districts, upazilas), other roles see a personal summary.
- **User management** (`/users`, HQ only): list users with their roles, and create new
  users (basic info, bank info, nominee info, password, and one or more roles with
  division/district/upazila scope). Authorization is enforced **server-side**, not just
  by hiding menu items.

## Roles & access

Role levels come from the seeded `roles` table (lower level = higher authority):

| Role                    | Level | Scope        |
| ----------------------- | ----- | ------------ |
| super_admin             | 1     | National     |
| hq_admin                | 2     | National     |
| hq_finance              | 2     | National     |
| hq_operations           | 2     | National     |
| divisional_head         | 3     | Division     |
| district_head           | 4     | District     |
| upazila_representative   | 5     | Upazila      |

HQ roles (levels 1–2) have full access including User Management. Divisional/district
heads and representatives get scoped menus.

## Project structure

```
app/
├── app/
│   ├── globals.css
│   ├── layout.tsx                 # root layout
│   ├── page.tsx                   # redirects to /dashboard
│   ├── login/
│   │   ├── page.tsx               # login screen
│   │   └── login-form.tsx         # client form (useFormState)
│   └── (app)/                     # authenticated area (route group)
│       ├── layout.tsx             # session gate + sidebar + topbar
│       ├── dashboard/page.tsx     # role-aware dashboard
│       └── users/
│           ├── page.tsx           # user list (HQ only)
│           ├── actions.ts         # createUserAction (HQ-gated, bcrypt, tx)
│           └── new/
│               ├── page.tsx       # create-user page (HQ only)
│               └── create-user-form.tsx
├── components/
│   ├── sidebar.tsx
│   └── topbar.tsx
├── lib/
│   ├── db.ts                      # pg Pool + query helpers
│   ├── types.ts                   # shared domain types
│   ├── rbac.ts                    # role/scope/menu helpers
│   ├── session.ts                 # JWT cookie + getSessionUser
│   ├── auth-actions.ts            # loginAction / logoutAction
│   └── users.ts                   # user + geography read helpers
├── scripts/
│   └── seed-admin.ts              # seeds the super_admin user
├── middleware.ts                  # route protection
├── .env.local.example
└── README.md
```

## Security notes

- Passwords are hashed with bcrypt (cost 10) — plaintext is never stored.
- Sessions use a signed JWT in an httpOnly, sameSite=lax cookie.
- All SQL uses parameterized queries ($1, $2, …); no string concatenation of input.
- Authorization is enforced server-side in pages and server actions, in addition to
  role-based menu rendering.
```
