# Ezamu - Triad Mentorship Platform

## Project Summary

Ezamu is a full-stack triad mentorship web platform designed to support high school students as they explore careers, college pathways, and personal development. The platform connects each student with a coach and an accountability peer, helping them discover their “Inner Hero” archetype, track S.M.A.R.T. goals, and stay engaged through mentorship, appointments, and action items.

Its intended use is to provide a structured mentorship experience where students receive guidance, accountability, and personalized support. Coaches can monitor student progress, assign next steps, and review assessments, while guardians can stay informed through a read-only view of the student experience.

## Overview

Ezamu is a full-stack triad mentorship web platform connecting students with coaches and accountability peers to help them discover their "Inner Hero" archetype and achieve S.M.A.R.T. goals.

## Intended Use

The platform is intended for three primary groups:

- **Students** — complete the Inner Hero assessment, book coaching sessions, view action items, message others, and create S.M.A.R.T. goals
- **Coaches** — manage student progress, assign action items, review goals, and manage appointment availability
- **Guardians** — view student progress through a read-only dashboard experience

The platform is especially useful for mentorship programs focused on college readiness, career exploration, motivation, and accountability.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (`artifacts/ezamu`) — hosted on Vercel
- **API framework**: Express 5 (`artifacts/api-server`) — hosted on Railway
- **Database**: PostgreSQL + Drizzle ORM — hosted on Supabase
- **Auth**: Clerk (white-label)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Versioning / Replication Notes

To best replicate the development setup, use the same core versions listed below:

- **Node.js**: 24
- **pnpm**: workspace-managed package manager
- **TypeScript**: 5.9
- **Express**: version 5
- **React + Vite**: as defined in `artifacts/ezamu/package.json`
- **Drizzle ORM**: as defined in workspace package files
- **Zod / drizzle-zod / Orval / esbuild**: as defined in the relevant `package.json` files

For the exact dependency versions used in the project, refer to:

- `package.json`
- `artifacts/ezamu/package.json`
- `artifacts/api-server/package.json`
- `pnpm-lock.yaml`

The `pnpm-lock.yaml` file should be used to reproduce the exact installed dependency tree.

## Installation and Setup

### Prerequisites

Before running the project, make sure the following are installed:

- **Node.js 24**
- **pnpm**
- Access to a **PostgreSQL** database
- A **Clerk** project for authentication
- Environment variable configuration for frontend and backend services

### Clone the Repository

```bash
git clone <your-repository-url>
cd <your-repository-folder>
