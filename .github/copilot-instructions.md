# Copilot Instructions — Musical Academy App

## Big-picture architecture
- Monorepo-style layout: Next.js 15 app in `app/` and shared UI in `components/`/`hooks/`/`lib/`; Django REST API in `backend/`.
- Frontend talks to the backend only through the Axios wrapper in `lib/api.ts`, which sets `Authorization: Bearer <access_token>` from cookies and auto-refreshes tokens on 401.
- API base URL comes from `NEXT_PUBLIC_API_URL` and defaults to `http://localhost:8009/api`.
- Backend endpoints are namespaced under `/api/...` and split by app: `users`, `academics`, `planning`, `finances`, `dashboard` (see `backend/musical_academy/urls.py`).

## Frontend conventions
- App Router structure with layouts in `app/` (e.g., `app/layout.tsx`, dashboard pages in `app/dashboard/**`).
- Auth state is stored in cookies and exposed via `context/AuthContext.tsx` (`login()`/`logout()` redirect to `/dashboard` or `/login`).
- Data fetching typically uses SWR hooks in `hooks/` (e.g., `hooks/useCourses.ts`, `hooks/useSchedule.ts`). These expect DRF pagination (`data.results`) but also handle non-paginated arrays.
- Prefer `api.*` helpers in `lib/api.ts` instead of raw Axios; add new API helpers there when expanding endpoints.
- UI is built with shadcn/ui primitives in `components/ui/` and feature components in `components/<domain>/`.

## Backend conventions
- Django 4.2 + DRF with JWT auth (`rest_framework_simplejwt`). Auth endpoints: `/api/auth/token/` and `/api/auth/token/refresh/`.
- SQLite is used in dev (`backend/db.sqlite3`), settings in `backend/musical_academy/settings.py`; `.env` provides `DEBUG`, `SECRET_KEY`, `ALLOWED_HOSTS`.
- Each domain app (`academics`, `planning`, `finances`, `users`, `dashboard`) exposes routers in `backend/<app>/urls.py`.

## Critical workflows
- Frontend dev: `pnpm dev` (Next.js). Build: `pnpm build`.
- Backend dev: `cd backend && source venv/bin/activate && python manage.py runserver 0.0.0.0:8009`.
- No separate test or lint scripts are defined for the Django backend.

## Teacher Profile & Attendance System
- Teachers have an `hourly_rate` field on `TeacherProfile` model (payment per hour).
- Sessions are tracked via `ClassSession` (recurring schedule) with individual occurrences in `SessionInstance` (handles rescheduling, cancellations, and attendance).
- `SessionInstance` has `teacher_is_absent` boolean flag to mark when teacher didn't work.
- Expense calculation: `worked_hours * hourly_rate` (excludes cancelled sessions and absences).
- Endpoint: `GET /api/planning/teacher/<id>/sessions/?year=YYYY&month=MM` returns all sessions for that month with attendance status and calculated expense.
- Frontend page: `/dashboard/teachers/[id]` shows monthly calendar with ability to toggle absence status per session; auto-updates totals and salary calculation.
- Use `useTeacherSessions` hook in `hooks/useTeacherSessions.ts` to fetch and `updateSessionAttendance()` to update attendance.

## Integration notes & examples
- Scheduling workflow uses planning endpoints: `POST /api/planning/check-availability/` and `POST /api/planning/suggest-slots/` (see `components/courses/session-dialog.tsx`).
- Course sessions are fetched via `/api/planning/sessions/?course=<id>` and may be paginated; handle both shapes (see `components/courses/course-schedule.tsx`).

