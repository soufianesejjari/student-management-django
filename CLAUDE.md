# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack music school management app for The Musical Academy (Fès, Morocco). Managing students, teachers, courses, schedules, enrollments, and billing.

- **Frontend**: Next.js 15 (App Router) + React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Django 4.2 + Django REST Framework, JWT auth, Celery (no Redis)
- **DB**: PostgreSQL in production, SQLite locally

## Commands

### Frontend

```bash
pnpm dev          # Start dev server on :3000
pnpm build        # Production build
pnpm lint         # ESLint
```

`NEXT_PUBLIC_API_URL` in `.env.local` controls the backend URL (default: `http://localhost:8009/api`).

### Backend (local, without Docker)

```bash
cd backend
source venv/bin/activate
python manage.py runserver 0.0.0.0:8009   # Dev server on :8009
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_db                   # Seed fixture data

# Background jobs (Celery uses SQLAlchemy broker, no Redis required)
celery -A musical_academy worker -l info
celery -A musical_academy beat -l info

# Testing
pytest
pytest academics/tests/                    # Run a single app's tests
pytest -k test_name                        # Run a specific test
```

### Full Stack via Docker

```bash
docker-compose up --build                  # All services
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
docker-compose exec backend python manage.py shell
```

Services: backend `:8009`, frontend `:3000`, PostgreSQL `:5432`.

## Architecture

### Frontend Structure

```
app/[locale]/          # All routes are under the locale segment (en/fr)
  layout.tsx           # NextIntlClientProvider wraps all pages
  dashboard/           # Main authenticated area
  login/
components/
  ui/                  # shadcn/ui primitives (do not edit directly)
  layout/              # Sidebar, header
  students/teachers/courses/finances/planning/rooms/
hooks/                 # Data-fetching hooks wrapping SWR + api singleton
lib/
  api.ts               # Central Axios singleton with JWT interceptors
  utils.ts
context/
  AuthContext.tsx       # Auth state (JWT from cookies)
i18n/
  config.ts            # Supported locales: en, fr
  request.ts           # next-intl server config
messages/
  en.json / fr.json    # Translation strings
```

**Routing**: The entire app is under `app/[locale]/`. The locale prefix (`/en/` or `/fr/`) is always present. next-intl middleware handles locale detection.

**API calls**: All API calls go through `lib/api.ts`, which is an Axios instance with:
- Automatic JWT `Authorization: Bearer` header injection from cookies
- Auto-refresh of expired access tokens using the refresh token cookie
- Redirect to `/login` on auth failure

**Data fetching**: Custom hooks in `hooks/` (e.g., `useStudents`, useCourses`) encapsulate SWR calls against the `api` singleton. Prefer these hooks in components rather than calling `api` directly.

**Forms**: React Hook Form + Zod for validation. Schema definitions live alongside the form components.

### Backend Structure

```
backend/
  musical_academy/     # Django project root (settings, urls, celery)
  users/               # Custom User model (admin/secretaire roles), StudentProfile, TeacherProfile
  academics/           # AcademicYear, Subject, Course, Enrollment, Subscription, StudentFee, AcademySettings
  enrollments/         # Enrollment service layer (separate from academics models)
  planning/            # Room, ClassSession, SessionInstance, TeacherMonthlyPayroll
  finances/            # Payment, Expense models
  dashboard/           # Aggregated stats endpoints
```

**Auth**: Custom `User` model extends `AbstractUser` with `role` field (`admin` / `secretaire`). Login accepts email or username (`users/authentication.py`). JWT tokens have 60-minute access / 1-day refresh lifetimes.

**Permissions**: Secretaires have granular Django model permissions that admins can assign/revoke via the API (`/api/users/secretaires/{id}/permissions/`).

**Billing automation**: `BillingService` (in `academics/services.py`) generates monthly/quarterly `Subscription` records and marks overdue ones. Run automatically via Celery Beat every hour (`academics.tasks.run_billing_automation`). Can also be triggered manually from the dashboard.

**Celery**: Uses SQLAlchemy as the broker (backed by the same DB — no Redis) and `django-db` as the results backend. In production the Docker image runs all three processes (web + worker + beat) when `PROCESS_TYPE=all`.

**AcademySettings**: Singleton model (pk=1) for runtime configuration (school info, free-course offer rules, default fees). Use `AcademySettings.get()` to read, never hardcode school info.

### Key env vars

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `.env.local` | Backend API base URL for the frontend |
| `DEBUG` | `backend/.env` | Django debug mode |
| `SECRET_KEY` | `backend/.env` | Django secret key |
| `DB_ENGINE` / `DB_*` | `backend/.env` | Database config (defaults to SQLite if unset) |
| `FRONTEND_URL` / `FRONTEND_URLS` | `backend/.env` | CORS allowed origins (comma-separated) |
| `PROCESS_TYPE` | Docker env | `all` \| `web` \| `worker` \| `beat` |

### TypeScript note

`next.config.mjs` sets `typescript.ignoreBuildErrors: true`. Type errors won't break the build, but new code should still be properly typed.
