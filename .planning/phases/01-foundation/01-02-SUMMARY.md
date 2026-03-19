---
phase: 01-foundation
plan: 02
subsystem: ui
tags: [nextjs, tailwindcss, shadcn-ui, react, typescript, dashboard]

requires:
  - phase: none
    provides: greenfield project
provides:
  - Next.js 14 frontend scaffold with Tailwind CSS and shadcn/ui
  - Dashboard landing page with quick-start study actions
  - API client module for FastAPI backend communication
  - shadcn/ui Button and Card component library
affects: [02-question-ui, 03-study-modes]

tech-stack:
  added: [next@14, react@18, tailwindcss@3, shadcn-ui, class-variance-authority, radix-ui, lucide-react, tailwind-merge, tailwindcss-animate]
  patterns: [app-router, client-components, css-variables-theming, cva-variants]

key-files:
  created:
    - frontend/app/layout.tsx
    - frontend/app/page.tsx
    - frontend/app/globals.css
    - frontend/components/dashboard/Dashboard.tsx
    - frontend/components/ui/button.tsx
    - frontend/components/ui/card.tsx
    - frontend/lib/api.ts
    - frontend/lib/utils.ts
    - frontend/tailwind.config.ts
    - frontend/next.config.mjs
  modified: []

key-decisions:
  - "Used Next.js 14 with App Router (not Pages Router) for modern React Server Component support"
  - "Used next.config.mjs instead of next.config.ts since Next.js 14 does not support TypeScript config"
  - "Added 'use client' directive to Dashboard for onClick handler support in App Router"

patterns-established:
  - "shadcn/ui component pattern: CVA variants + Radix primitives + forwardRef + cn() utility"
  - "API client pattern: centralized apiFetch wrapper with typed generics and error handling"
  - "CSS theming: HSL CSS custom properties in globals.css consumed by Tailwind config"

requirements-completed: [QGEN-05]

duration: 14min
completed: 2026-03-19
---

# Phase 01 Plan 02: Frontend Scaffold & Dashboard Summary

**Next.js 14 frontend with Tailwind CSS, shadcn/ui components, and a clean dashboard landing page featuring quick-start study actions and USMLE step coverage cards**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-19T08:28:09Z
- **Completed:** 2026-03-19T08:42:42Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments
- Scaffolded Next.js 14 frontend with App Router, TypeScript, and Tailwind CSS v3
- Installed shadcn/ui with Button and Card components using CVA variant system
- Built Dashboard landing page with 3 quick-start action cards and 3 USMLE step coverage cards
- Created centralized API client module targeting FastAPI backend at localhost:8000
- Established clean Linear/Notion-inspired visual design with CSS variable theming

## Task Commits

Each task was committed atomically:

1. **Task 1: Next.js project scaffold with Tailwind CSS and shadcn/ui** - `f2ca161` (feat)
2. **Task 2: Dashboard landing page with quick-start buttons and USMLE step cards** - `92f87f2` (feat)

**Supplementary:** `b3a69ed` (chore: frontend .gitignore)

## Files Created/Modified
- `frontend/package.json` - Project manifest with Next.js, React, Tailwind, shadcn/ui dependencies
- `frontend/tsconfig.json` - TypeScript configuration with path aliases (@/*)
- `frontend/tailwind.config.ts` - Tailwind CSS config with shadcn/ui design tokens
- `frontend/postcss.config.mjs` - PostCSS config for Tailwind processing
- `frontend/next.config.mjs` - Next.js configuration (minimal)
- `frontend/app/layout.tsx` - Root layout with Inter font, metadata, and global styles
- `frontend/app/page.tsx` - Root page rendering Dashboard component
- `frontend/app/globals.css` - Global styles with shadcn/ui CSS variable theme (light + dark)
- `frontend/components/ui/button.tsx` - shadcn/ui Button with 6 variants and 4 sizes
- `frontend/components/ui/card.tsx` - shadcn/ui Card with Header, Title, Description, Content, Footer
- `frontend/components/dashboard/Dashboard.tsx` - Dashboard with quick-start actions and USMLE step cards
- `frontend/lib/utils.ts` - cn() utility merging clsx + tailwind-merge
- `frontend/lib/api.ts` - API client with apiFetch generic wrapper and checkHealth function
- `frontend/.gitignore` - Ignores node_modules, .next, env files

## Decisions Made
- Used Next.js 14 (not latest) for stability with Node.js 18 compatibility
- Used `next.config.mjs` instead of `.ts` since Next.js 14 does not support TypeScript config files
- Added `"use client"` directive to Dashboard component because onClick handlers require client-side rendering in App Router
- Used Tailwind CSS v3 (not v4) for shadcn/ui compatibility and stable API

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added "use client" directive to Dashboard component**
- **Found during:** Task 2 (Dashboard page)
- **Issue:** Next.js App Router treats components as Server Components by default; onClick handlers cannot be passed to server-rendered components
- **Fix:** Added `"use client"` directive at top of Dashboard.tsx
- **Files modified:** frontend/components/dashboard/Dashboard.tsx
- **Verification:** `npm run build` succeeds without errors
- **Committed in:** 92f87f2 (Task 2 commit)

**2. [Rule 3 - Blocking] Changed next.config.ts to next.config.mjs**
- **Found during:** Task 1 (scaffold verification)
- **Issue:** Next.js 14 does not support TypeScript config files (.ts), build failed
- **Fix:** Renamed to next.config.mjs with JSDoc type annotation
- **Files modified:** frontend/next.config.mjs (created instead of next.config.ts)
- **Verification:** `npm run build` succeeds
- **Committed in:** f2ca161 (Task 1 commit)

**3. [Rule 3 - Blocking] Downgraded Tailwind CSS from v4 to v3**
- **Found during:** Task 1 (dependency installation)
- **Issue:** npm installed Tailwind CSS v4 by default, which is incompatible with shadcn/ui's v3 config format
- **Fix:** Explicitly installed tailwindcss@3
- **Files modified:** frontend/package.json
- **Verification:** Build and Tailwind processing work correctly
- **Committed in:** f2ca161 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All auto-fixes necessary for correctness and compatibility. No scope creep.

## Issues Encountered
- `create-next-app` CLI hung on interactive prompts (React Compiler question) even with piped input; solved by manually scaffolding the project structure and installing dependencies individually.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Frontend scaffold is complete and builds cleanly
- Dashboard provides the landing page structure for question UI (Phase 2)
- API client is ready to connect to FastAPI backend once Plan 01-01 (backend) is executed
- shadcn/ui component library established for building question/answer interfaces

## Self-Check: PASSED

All 13 files verified present. All 3 commits verified in git log.

---
*Phase: 01-foundation*
*Completed: 2026-03-19*
