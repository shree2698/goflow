# GoFlow

GoFlow is a full-stack, enterprise-grade workflow management and automation application built with Go, PostgreSQL, Redis, Next.js, and WebSockets.

---

## 🚀 Quick Start (Docker Compose — Recommended)

The simplest way to run the entire GoFlow stack (Backend API, Workers, Frontend, PostgreSQL, Redis) is with Docker Compose.

### Prerequisites
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

### Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/shree2698/goflow.git
   cd goflow
   ```

2. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Launch the Full Stack:**
   ```bash
   docker-compose up --build -d
   ```

4. **Access the Application:**
   - **Frontend App:** [http://localhost:3000](http://localhost:3000)
   - **Backend API:** [http://localhost:8080/api/v1/health](http://localhost:8080/api/v1/health)

---

## 🛠 Local Development Setup

If you prefer to run services manually for local development:

### Prerequisites
- **Go**: 1.22+
- **Node.js**: 20+ & **npm**: 10+
- **PostgreSQL**: 16+
- **Redis**: 7+

---

### 1. Database & Cache Infrastructure

Start PostgreSQL and Redis via Docker Compose:
```bash
docker-compose up -d postgres redis
```

---

### 2. Backend Setup (Go API Server)

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Install Go dependencies:
   ```bash
   go mod download
   ```

3. Run database migrations:
   ```bash
   # Migrations automatically run on server startup, or execute manually:
   go run ./cmd/server
   ```

4. Start the API Server:
   ```bash
   go run ./cmd/server
   ```
   *The backend server will run on `http://localhost:8080`.*

---

### 3. Frontend Setup (Next.js)

1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   *The frontend application will run on `http://localhost:3000`.*

---

## 📊 Features & Capabilities

- **Authentication & Security:** JWT Token Auth, RBAC, Rate Limiting, HTTP Security Headers.
- **Projects & Tasks:** Kanban boards, task assignments, priority matrix, status workflows.
- **Workflow Engine:** Event-driven automation rules, custom conditions & actions.
- **Real-Time Communication:** WebSockets (`/api/v1/ws`) for live notification toasts and task state updates.
- **Analytics & Dashboard:** Productivity metrics, 7-day velocity tracking, project completion rates.
- **Search & Filtering:** PostgreSQL `tsvector` full-text search with `Cmd+K` Command Palette UI.

---

## 📁 Project Directory Structure

```text
goflow/
├── backend/                # Go Backend
│   ├── cmd/                # Entrypoints (server, worker)
│   ├── internal/           # Handlers, Services, Repositories, Domain, Engine, WS
│   ├── migrations/         # PostgreSQL Schema Migrations
│   └── Dockerfile          # Multi-stage Go Dockerfile
├── frontend/               # Next.js 14 Frontend
│   ├── src/app/            # App Router Pages & Layouts
│   ├── src/components/     # UI Components (Kanban, Workflows, Notifications, Search)
│   └── Dockerfile          # Multi-stage Node Dockerfile
├── docker-compose.yml      # Container Orchestration
├── requirements.md         # Full Product Requirements Document
└── work-plan.md            # 15-Phase Execution Work Plan
```

---

## 📄 License
MIT License © GoFlow Team
