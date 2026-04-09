# Ezamu - Triad Mentorship Platform

## Overview

Ezamu is a full-stack triad mentorship web platform connecting students with coaches and accountability peers to help them discover their "Inner Hero" archetype and achieve S.M.A.R.T. goals.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/ezamu) — hosted on Vercel
- **API framework**: Express 5 (artifacts/api-server) — hosted on Railway
- **Database**: PostgreSQL + Drizzle ORM — hosted on Supabase
- **Auth**: Clerk (white-label)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Tables

- **users** — all users (students, coaches, guardians); contains all fields from OpenAPI spec
- **appointments** — appointments between students and coaches
- **action_items** — tasks assigned to students by coaches
- **coach_availability** — available slots for coaches
- **assessment_results** — Inner Hero quiz results per student
- **notifications** — in-app notifications per user
- **messages** — chat messages between users
- **smart_goals** — SMART goals created by students, approved/denied by coaches
- **coach_notes** — private coach notes per student (only visible to the coach)

## Pages

- `/` — Landing page (public): hero, how it works, testimonials, CTA
- `/sign-in` — Clerk sign-in
- `/sign-up` — Clerk sign-up
- `/onboarding` — Post-signup onboarding flow
- `/dashboard` — Role-aware dashboard (coach sees CoachDashboardPage, student sees StudentDashboardPage)
- `/assessment` — 9-question Inner Hero assessment
- `/appointments` — Browse coaches and book sessions
- `/coach/:coachId` — Individual coach profile
- `/coach/student/:studentId` — Coach view of a student (info, progress, SMART goals, private notes)
- `/profile` — Edit profile
- `/chat` — Messaging
- `/contact` — Contact page (public)

## Design

- **Background gradient**: `linear-gradient(180deg, #121c34 0%, #3131d8 40%, #add8e6 100%)`
- **Color palette**: #121c34 (dark navy), #607b7d (steel teal), #dbb68f (warm sand), #bb7e5d (terra cotta), #acedff (sky blue)
- **Inner Hero archetypes**: Thinker, Helper, Planner, Doer

## User Roles

- **Student**: takes assessment, books coaches, receives action items
- **Coach**: manages availability, assigns action items, views student progress
- **Guardian**: read-only view of their student's dashboard (invite-based)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
