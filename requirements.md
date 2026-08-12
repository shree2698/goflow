# GoFlow: Requirements Document

**Version:** 1.0.0  
**Status:** Draft / Initial Specification  
**Primary Stack:** Go (Backend REST API, Background Workers, Engine, WebSockets) + Next.js (TypeScript Frontend) + PostgreSQL + Redis  

---

## 1. Project Overview

### What is GoFlow?
**GoFlow** is an intelligent task management and workflow automation platform designed to help individuals and teams manage projects, tasks, workflows, notifications, and automated background actions seamlessly.

### What Problem It Solves
Modern professionals and teams struggle with fragmented workflows. Traditional task managers require constant manual oversight: sending reminders, moving dependent tasks forward, updating statuses, or triggering downstream actions. Existing enterprise workflow tools (e.g., Temporal, Camunda, Zapier) are either overly complex to integrate, expensive, or too heavy for lightweight task management. GoFlow bridges this gap by providing an integrated, intuitive task management interface paired with a lightweight, responsive background automation engine.

### Who It Is For
- **Individual Power Users:** Freelancers, developers, and creators seeking advanced automation over personal task queues.
- **Team Members & Team Admins:** Collaborative groups needing project isolation, role-based access control, task delegation, and automated workflow notifications.
- **Engineers / Technical Assessors:** Portfolio reviewers inspecting production-grade backend engineering practices in Go.

### Main Purpose of the Project & Why Go is Used
The primary goal of GoFlow is to serve as a serious, production-grade portfolio application demonstrating mastery over modern backend engineering concepts in **Go (Golang)**. Go is chosen specifically for:
- High-concurrency performance with low memory footprint.
- Native concurrency primitives (Goroutines and Channels) ideal for event processing and background worker pools.
- Robust standard library and ecosystem for building fast REST APIs and WebSocket servers.
- Excellent fit for containerized, cloud-native deployments.

### What Makes It Different from a Basic Task-Management CRUD App
Unlike standard CRUD applications, GoFlow incorporates:
1. **Event-Driven Workflow Engine:** Custom rule execution (`WHEN -> CONDITION -> ACTION`) evaluated asynchronously in Go without blocking main API handlers.
2. **Resilient Background Processing:** Built-in job queue supporting retries, dead-letter job logging, deduplication, and scheduled cron-like reminders using Goroutines, channels, and Redis.
3. **Native WebSockets:** Real-time event broadcasting (task updates, workflow status changes, live notifications) managed via efficient Go client hubs.
4. **Production-Grade Architecture:** Strict layered architecture, Redis caching, token bucket rate limiting, structured logging, distributed tracing headers, and robust database migrations.

---

## 2. Goals

### 2.1 Core Project Goals
- **Productivity & Task Management:** Provide intuitive UI/API abstractions for projects, task boards, subtasks, tags, comments, and priority queues.
- **Workflow Automation:** Enable users to construct multi-stage conditional rules ("If task becomes COMPLETED, auto-create follow-up task").
- **Background Processing & Scheduled Actions:** Implement robust job queues with Go worker pools for email handling, notifications, deadline checks, and cleanup tasks.
- **Notifications & Real-Time Updates:** Deliver in-app, email, and instant WebSocket notifications for task updates and workflow state shifts.
- **Scalable Backend Architecture:** Build a modular, clean backend in Go with clean package separation (Handler -> Service -> Repository).
- **Production-Quality Go Development:** Demonstrate industry-standard practices: context propagation, graceful shutdown, comprehensive unit/integration test coverage, structured logging, error wrapping, and robust middleware.
- **Portfolio Value:** Provide comprehensive documentation, OpenAPI/Swagger specifications, clean frontend integration (Next.js/TypeScript), Docker multi-stage builds, and deployment readiness.

### 2.2 Non-Goals (Out of Scope for V1)
- **Enterprise BPMN / Visual Flowchart Canvas:** V1 will focus on structured rule definitions rather than a complex drag-and-drop node graph canvas.
- **Multi-Tenant Enterprise SSO / SAML:** Standard JWT access/refresh token authentication and OAuth2 (Google/GitHub) only; SAML/Okta integration is deferred.
- **Complex Third-Party Plugin SDKs:** Third-party webhooks and native integration plugins (e.g., Slack, Jira) are deferred to V2.
- **Distributed Microservices Mesh:** GoFlow backend will be designed as a modular monolith with clean package separation, making future microservice extraction straightforward without unnecessary initial overhead.

---

## 3. Target Users

### 3.1 Individual User
Uses GoFlow for personal tasks, daily planning, and self-hosted productivity automations. Has full ownership over personal workspaces and workflow rules.

### 3.2 Team Member
Collaborates within shared project workspaces. Creates, edits, assigns, and comments on tasks. Configures personal notification settings and receives real-time updates on assigned or watched tasks.

### 3.3 Team Admin
Manages project settings, member invitations, and role permissions (`Owner`, `Admin`, `Member`, `Viewer`). Configures shared project-level automated workflows and monitors workflow execution health.

### 3.4 Future Enterprise User
A future growth vector requiring workspace audit logs, custom role definitions, advanced security policies, and resource usage analytics. Schemas in V1 will be designed with multi-tenant awareness, but enterprise enforcement is deferred.

---

## 4. Core Features

### 4.1 Authentication
- **Registration & Login:** Email and password registration with client and server-side validation.
- **Logout:** Revokes active sessions and clears authentication cookies.
- **Password Hashing:** Argon2id or bcrypt (cost factor 12+).
- **Access Tokens:** Short-lived JWTs (e.g., 15 minutes) passed in request headers.
- **Refresh Tokens:** Long-lived tokens stored in HttpOnly, SameSite=Strict cookies; tracked in Redis/PostgreSQL for instant revocation.
- **Session Management:** View active sessions and remote log out of specific devices or all sessions.
- **Password Reset & Email Verification:** Secure token generation with expiration, dispatched via background email queue.
- **Account Security:** Account lockout after consecutive failed login attempts.

### 4.2 User Management
- **Profile:** Full name, avatar URL, bio, contact email.
- **Preferences:** Theme mode (light/dark), default landing page/view.
- **Timezone:** Timezone selection crucial for accurate scheduled reminders and due-date evaluations.
- **Notification Preferences:** Toggles for channel preferences (In-App vs Email) per notification event type.
- **Account Settings:** Delete account / export data request abstractions.

### 4.3 Projects
- **Create Project:** Define name, description, slug, accent color, and icon.
- **Update Project:** Modify project metadata and configuration.
- **Delete/Archive Project:** Soft-delete (archive) or permanently remove projects and associated tasks.
- **Project Members:** Invite team members by email or user ID.
- **Project Roles:** Role-Based Access Control (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`).
- **Project Status:** `ACTIVE`, `ARCHIVED`, `COMPLETED`.
- **Project Metadata:** Track total tasks, completion rates, and last activity timestamps.

### 4.4 Tasks
#### Supported Attributes
- **Title:** Required short summary text.
- **Description:** Detailed markdown body.
- **Status:** Task state progression (`TODO`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`, `ARCHIVED`).
- **Priority:** Enum (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
- **Due Date:** Optional timestamp with timezone support.
- **Assignee:** Optional link to a team member.
- **Project:** Foreign key to parent project.
- **Tags:** Array of string labels (e.g., `bug`, `frontend`, `v1.0`).
- **Subtasks:** Nested checklist items with title and completion state.
- **Comments:** Discussion thread on each task with author and timestamps.
- **Attachments (Future-Ready):** Storage metadata abstraction for file uploads.
- **Timestamps:** `created_at`, `updated_at`, `completed_at`.

### 4.5 Workflow Automation (Core Differentiating Feature)
Allows users to define rules following the structure: `WHEN -> CONDITION -> ACTION`.

#### Examples:
1. **Deadline Alert:**
   - **WHEN:** Task due date is approaching (within 2 hours).
   - **IF:** Task status is NOT `COMPLETED`.
   - **THEN:** Send notification to assignee.
2. **Follow-up Creation:**
   - **WHEN:** Task status becomes `COMPLETED`.
   - **IF:** Task has tag `requires-review`.
   - **THEN:** Create a new task titled "Review: [Original Task Title]" assigned to Project Admin.

#### Requirements:
- **Triggers:** `TASK_CREATED`, `TASK_STATUS_CHANGED`, `TASK_DUE_SOON`, `TASK_OVERDUE`, `TASK_ASSIGNED`.
- **Conditions:** Field comparators (`EQUALS`, `NOT_EQUALS`, `CONTAINS`, `IN`, `IS_EMPTY`). Supports AND/OR condition grouping.
- **Actions:** `SEND_NOTIFICATION`, `CREATE_TASK`, `UPDATE_TASK_STATUS`, `ASSIGN_USER`, `ADD_TAG`.
- **Workflow Activation:** Toggle workflows `ACTIVE` or `INACTIVE`.
- **Workflow Execution History:** Log trigger event, evaluated conditions, action results, timestamps, and execution duration.
- **Failure Handling:** Automatic retry with exponential backoff; dead-letter status recording for inspection upon persistent failure.

---

## 5. Workflow Engine Requirements

### 5.1 Architecture & Design
- **Storage:** Workflows are stored in PostgreSQL as structured records with `conditions` and `actions` stored in optimized JSONB columns.
- **Triggering & Event Generation:** When domain operations occur (e.g., Task Service updates a status), a strongly-typed `DomainEvent` is emitted to an internal Event Bus / Redis Stream.
- **Worker Job Processing:** Background Go worker goroutines consume event payloads, query matching active workflows, and execute jobs asynchronously without delaying HTTP response cycles.
- **Condition Evaluation:** Lightweight evaluator parses condition JSON trees against task state snapshots using deterministic Boolean evaluation logic.
- **Action Execution:** Actions run sequentially or concurrently depending on action chain dependencies.
- **Retries & Failure Recording:** Retries are managed via exponential backoff (e.g., 3 attempts). Failed executions write diagnostic stack traces to the `workflow_executions` table.
- **Deduplication / Idempotency:** Redis distributed locking (`lock:workflow:{workflow_id}:{event_id}`) ensures each event triggers a workflow step exactly once.
- **Execution Tracking:** Detailed history logs enable users to trace why a workflow ran, which conditions passed/failed, and what actions were performed.

---

## 6. Background Jobs & Worker Architecture

### 6.1 Job Types & Use Cases
- **Scheduled Reminders:** Check tasks nearing due dates and dispatch reminders.
- **Workflow Execution:** Async worker processing of `WHEN -> CONDITION -> ACTION` chains.
- **Notification Processing:** Formatting and delivering in-app notifications.
- **Email Processing:** Queuing, template rendering, and delivery via SMTP/Provider API.
- **Cleanup Jobs:** Purging expired sessions, stale password reset tokens, and old execution logs.
- **Analytics Aggregation:** Daily computation of task completion metrics and project velocity.

### 6.2 Engine Capabilities
- **Job Queue:** Redis-backed persistent task queue (e.g., using `asynq` or custom Redis stream consumer group).
- **Worker Processes:** Configurable worker pools running in Go goroutines.
- **Retry Mechanism:** Configurable max retry count with exponential backoff and jitter.
- **Failed Jobs (DLQ):** Dead-letter queue for jobs failing after max retries.
- **Job Status & Priority:** Enqueue jobs with priorities (`CRITICAL`, `DEFAULT`, `LOW`).
- **Graceful Shutdown:** Intercept OS signals (`SIGINT`, `SIGTERM`), stop accepting new jobs, cancel active contexts, and wait for running workers using `sync.WaitGroup`.
- **Concurrent Processing:** Safe shared memory access using Go channels, atomic counters, and mutexes.

### 6.3 Use of Goroutines and Channels
- **Goroutines:** Spawn worker loops, WebSocket client pumps, event dispatchers, and cron tickers lightweightly (thousands of concurrent routines).
- **Channels:**
  - Worker pool dispatch channels for task distribution.
  - Event bus distribution channels for fan-out broadcasting.
  - Shutdown signal channels (`chan struct{}`) for graceful worker termination.

---

## 7. Notification System

### 7.1 Delivery Channels
- **In-App Notifications:** Persisted in PostgreSQL, queryable via API, and delivered instantly via WebSockets.
- **Email Notifications:** Asynchronously rendered HTML templates sent via background workers.
- **Real-Time Push:** WebSockets push notification events directly to active user browser sessions.

### 7.2 Core Functional Requirements
- **Notification Types:** `TASK_ASSIGNED`, `TASK_REMINDER`, `WORKFLOW_ALERT`, `COMMENT_MENTION`, `PROJECT_INVITE`.
- **Read/Unread Tracking:** Track `is_read` status and `read_at` timestamp per notification. Bulk "mark all as read" capability.
- **Notification Preferences:** Fine-grained user settings to suppress specific channels or notification types.
- **Retry & Resiliency:** Failed email deliveries are retried via background job queue without breaking in-app notification creation.

---

## 8. Real-Time Features (WebSockets)

### 8.1 WebSocket Capabilities
- **Task Status Changes:** Live updates across board views when team members move tasks.
- **Live Notifications:** Unread notification count badge updates and toast alerts.
- **Workflow Execution Updates:** Real-time progress updates on workflow runs.
- **Project Activity Feed:** Live stream of project events (comments, edits).

### 8.2 Architecture & Infrastructure
- **Connection Handling:** WebSocket upgrade endpoint (`/api/v1/ws`) managed by Go client hub.
- **Authentication:** Handshake authentication using short-lived WebSocket ticket tokens passed during connection setup.
- **Reconnection:** Client auto-reconnect strategy with exponential backoff and state re-synchronization.
- **Connection Cleanup:** Heartbeat ping/pong frames detect dead sockets; cleanup goroutines unregister clients and release resources.
- **Broadcasting Events:** Targeted message delivery to specific `user_id` channels or `project_id` rooms.

---

## 9. Dashboard & Analytics

### 9.1 Overview & Metrics
- **Task Statistics:** Total tasks, completed tasks, pending tasks, overdue tasks, blocked tasks.
- **Project Progress:** Percentage completion bars and task distribution per project.
- **Workflow Analytics:** Total workflow executions, success vs. failure ratios, most triggered workflows.
- **Productivity Trends:** 7-day and 30-day task completion velocity charts.

---

## 10. Search & Filtering

### 10.1 Functional Capabilities
- **Task Search:** Text search over task `title` and `description` using PostgreSQL full-text search (`tsvector`) or indexed substring search.
- **Filtering Options:**
  - Project ID filter
  - Status filter (`TODO`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`)
  - Priority filter (`LOW`, `MEDIUM`, `HIGH`, `URGENT`)
  - Assignee filter (specific user or `UNASSIGNED`)
  - Date ranges (due date before/after, created date range)
  - Tag filter (matches one or all selected tags)
- **Sorting:** Multi-field sort support (`due_date`, `priority`, `created_at`, `title`).

---

## 11. API Requirements & Conventions

### 11.1 Design Standards
- **RESTful Principles:** Standard HTTP methods (`GET`, `POST`, `PATCH`, `DELETE`).
- **API Versioning:** Prefix all endpoints with `/api/v1`.
- **Request Validation:** Strict request body validation returning descriptive field-level error messages.
- **Response Standard:**

```json
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

- **Error Standard:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Invalid input parameters",
    "details": [
      { "field": "title", "issue": "title is required" }
    ]
  }
}
```

- **HTTP Status Codes:** Proper usage of `200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`.
- **Pagination & Sorting:** Default limit 20, max 100. Supports offset/limit and cursor-based pagination.
- **Authentication & Authorization:** Bearer JWT in `Authorization` header; RBAC enforced per endpoint.
- **Rate Limiting:** Token bucket rate limiter enforced via Redis (e.g., 100 req/min per IP/user).

### 11.2 API Resource Groups Overview
```text
/api/v1/auth          - Authentication, token refresh, password resets
/api/v1/users         - User profile, preferences, settings
/api/v1/projects      - Project management, members, roles
/api/v1/tasks         - Task CRUD, status updates, comments, subtasks
/api/v1/workflows     - Workflow rule definitions, execution logs
/api/v1/notifications - In-app notification feeds, read state management
/api/v1/analytics     - Dashboard summary statistics and metrics
/api/v1/ws            - WebSocket upgrade connection endpoint
```

---

## 12. Proposed Data Schema Architecture (PostgreSQL)

```sql
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects Table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Project Members Table
CREATE TABLE project_members (
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, user_id)
);

-- Tasks Table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'TODO',
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    due_date TIMESTAMPTZ,
    creator_id UUID NOT NULL REFERENCES users(id),
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Workflows Table
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(100) NOT NULL,
    conditions JSONB NOT NULL DEFAULT '[]',
    actions JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workflow Executions Log
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL, -- SUCCESS, FAILED, SKIPPED
    error_message TEXT,
    execution_time_ms INT,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Query Performance
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE status != 'COMPLETED';
CREATE INDEX idx_workflows_trigger ON workflows(trigger_type) WHERE is_active = true;
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
```

---

## 13. Technical Non-Functional Requirements & Engineering Standards

### 13.1 Backend Code Architecture (Go)
- **Layered / Clean Architecture Structure:**
  - `cmd/server`: Application entrypoint & initialization.
  - `cmd/worker`: Background job consumer entrypoint.
  - `internal/config`: Environment configuration parsing (Viper / envconfig).
  - `internal/domain`: Pure entities, interfaces, constants, and domain errors.
  - `internal/handler`: HTTP & WebSocket handlers (Gin / Chi / Fiber).
  - `internal/service`: Core business logic (Tasks, Workflows, Auth).
  - `internal/repository`: Database access layer (pgx / SQLc / GORM).
  - `internal/worker`: Background worker job definitions and consumer handlers.
  - `pkg/`: Generic reusable utilities (crypto, logger, validator).

### 13.2 Testing Strategy
- **Unit Testing:** Test domain services and condition evaluation logic with standard `testing` package and `testify`.
- **Integration Testing:** Test API endpoints using testcontainers-go or mock DB drivers.
- **Race Condition Detection:** All test suites run with `go test -race ./...`.

### 13.3 DevOps & Containerization
- **Multi-stage Dockerfile:** Build binary in `golang:alpine` builder stage; produce minimal final production image using `alpine` or `scratch`.
- **Docker Compose:** One-command local setup initializing `api-server`, `worker-process`, `postgres`, `redis`, and `nextjs-frontend`.
