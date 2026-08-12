# GoFlow

GoFlow is a modern web application for workflow management and automation. It allows users to define, execute, and monitor custom workflows with a seamless drag-and-drop interface.

## Tech Stack

| Component | Technology |
| --- | --- |
| Backend | Go 1.22+, Gin, GORM, sqlc, asynq |
| Frontend | Node.js 18+, Next.js, React, Tailwind CSS, Zustand |
| Database | PostgreSQL 16 |
| Cache/Queue | Redis 7 |
| Deployment | Docker, Docker Compose |

## Features Overview
- Visual drag-and-drop workflow builder
- Real-time workflow execution tracking
- Background task processing and scheduling
- Comprehensive dashboard and analytics
- User authentication and role-based access control

## Prerequisites
Ensure you have the following installed:
- Go 1.22+
- Node.js 18+
- Docker & Docker Compose

## Quick Start
1. Clone the repository
2. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Start the infrastructure services using Docker Compose:
   ```bash
   docker-compose up -d
   ```

## Development Setup

### Backend
1. Navigate to the `backend` directory.
2. Install dependencies: `go mod download`
3. Run the server: `go run cmd/server/main.go`

### Frontend
1. Navigate to the `frontend` directory.
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

## Project Structure
- `backend/`: Go backend application source code
  - `cmd/`: Application entrypoints (server, worker)
  - `internal/`: Private application and library code
  - `pkg/`: Publicly accessible library code
  - `migrations/`: Database migration files
- `frontend/`: Next.js frontend application source code
- `docs/`: Project documentation and design files

## License
MIT License
