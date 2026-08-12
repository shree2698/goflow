# GoFlow Implementation Workplan

**Version:** 1.0.0  
**Status:** Active Execution Plan  
**Core Stack:** Go (Backend REST API, Workers, Engine, WebSockets) + Next.js 14+ (TypeScript & Tailwind CSS) + PostgreSQL + Redis  
**Theme Standard:** Cherry Red Dark Theme (Obsidian canvas `#0e090a`, Cherry Red accent `#e6193c`)

---

## Phase 1: Environment & Project Foundation Setup
- [ ] Initialize repository structure with modular Go backend (`/cmd`, `/internal`) and Next.js frontend (`/frontend`).
- [ ] Setup Docker Compose environment featuring PostgreSQL 16 and Redis 7.
- [ ] Configure database migration runner (`golang-migrate` / `go-migrate`) with core schema definitions.
- [ ] Setup environment variable parsing and configuration management in Go (`viper` or `envconfig`).

---

## Phase 2: Go Backend Architecture & Infrastructure Layer
- [ ] **Database & Models:** Implement GORM/sqlx database access layer with clean repository interfaces for Users, Projects, Tasks, Workflows, and Notifications.
- [ ] **Redis Caching & Session Store:** Implement Redis connection pool for refresh token blacklisting, rate limiting, and caching.
- [ ] **Authentication System:** Build JWT token service, bcrypt/argon2 hashing, HttpOnly refresh cookies, and auth middleware.
- [ ] **RBAC & Authorization Middleware:** Implement project-level RBAC (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`).

---

## Phase 3: Core API Endpoints & CRUD Controllers
- [ ] **Auth REST Endpoints:** Implement `/api/v1/auth` routes (`register`, `login`, `refresh`, `logout`, `password-reset`).
- [ ] **Projects REST API:** Implement `/api/v1/projects` endpoints with project isolation and member management.
- [ ] **Tasks & Comments REST API:** Implement `/api/v1/tasks` endpoints supporting statuses (`TODO`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`), tags, subtasks, and comments.
- [ ] **Notifications REST API:** Implement `/api/v1/notifications` endpoints for fetching and marking notifications read.

---

## Phase 4: Async Workflow Engine & Worker Pool
- [ ] **Event Bus & Publisher:** Implement internal Go channel event bus for task lifecycle events (`task.created`, `task.updated`, `task.completed`).
- [ ] **Workflow Engine Logic:** Build `WHEN -> CONDITION -> ACTION` rule evaluator supporting dynamic field comparisons and action dispatching.
- [ ] **Background Worker Pool:** Construct worker pool using Goroutines to process background jobs (email dispatches, deadline reminders, workflow actions) with retry & dead-letter logging.
- [ ] **WebSocket Real-Time Server:** Build Go WebSocket hub managing connection lifecycle, room subscriptions, and broadcasting live UI updates.

---

## Phase 5: Next.js Frontend Development (Cherry Red Dark Theme)
- [ ] **Design Tokens & Global CSS:** Implement the Cherry Red Dark Theme in `globals.css` / Tailwind CSS config:
  - Background Layer 0: `hsl(350, 25%, 5%)` (`#0e090a`)
  - Background Layer 1: `hsl(350, 20%, 9%)` (`#1b1315`)
  - Background Layer 2: `hsl(350, 18%, 15%)` (`#2c1e22`)
  - Border Neutral: `hsl(350, 15%, 25%)` (`#483439`)
  - Primary Accent (Cherry Red): `hsl(348, 85%, 52%)` (`#e6193c`)
  - Accent Hover: `hsl(348, 85%, 44%)` (`#c41030`)
- [ ] **Core Layout & Navigation:** Build sticky header, responsive sidebar with active route highlights, and search palette (Cmd+K).
- [ ] **Auth Pages:** Create `/login` and `/register` pages with form validation (React Hook Form + Zod).
- [ ] **Project Board & Kanban View:** Build interactive drag-and-drop Kanban board (`/projects/[id]`) with filters and priority badges.
- [ ] **Workflow Builder Page:** Build visual rule editor (`/projects/[id]/workflows`) and execution log inspector.
- [ ] **WebSocket Integration & Notification Toast:** Implement `useWebSocket` hook for real-time notification toasts and task updates.

---

## Phase 6: System Verification, Testing & Polish
- [ ] Write unit tests for Go services and repository layers using `testify`.
- [ ] Write end-to-end integration tests for the workflow engine (`task state change -> trigger evaluation -> action execution`).
- [ ] Run build verification for Next.js (`npm run build`) and Go API server (`go build ./cmd/server`).
- [ ] Validate dark theme visual contrast and mobile responsiveness.
