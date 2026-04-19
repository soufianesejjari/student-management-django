# I18n Migration Plan & Notes

This document tracks the progress of replacing hardcoded French strings with dynamic `next-intl` translation hooks across the frontend.

## 1. Users / Secretaries Page
**File:** `app/[locale]/dashboard/users/page.tsx`
**Status:** ✅ Complete
**Notes:** Added keys to `en.json` and `fr.json`. Replaced statically typed French words with `t("key")` variables (for dialogs, actions, labels, and roles).

## 2. Academics & Subjects
**File:** `components/academics/subjects-management.tsx`
**Status:** ❌ Pending
**Notes:** Labels for "Nom du sujet", "Type", "Couleur", "Sujets musicaux" need localization.

## 3. Planning Dialogs
**File:** `components/planning/reschedule-dialog.tsx`
**Status:** ❌ Pending
**Notes:** Text like "Reschedule Session", "New Date", "Start Time", "End Time".

## 4. Sub-components (Payments, Courses, Modes)
**Files:** 
- `components/students/payments-table.tsx`
- `components/courses/course-dialog.tsx`
- `components/courses/course-schedule.tsx`
- `components/mode-toggle.tsx`
**Status:** ❌ Pending
**Notes:** Miscellaneous dialogs and tables needing headers and labels replaced.

---

*I will systematically update this file status as we progress through each component.*