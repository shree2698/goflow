# GoFlow: Design System & UI Specification

**Version:** 1.0.0  
**Status:** Initial Design Specification  
**Source of Truth:** [`requirements.md`](file:///E:/ME/goflow/requirements.md) & [`architecture.md`](file:///E:/ME/goflow/architecture.md)  
**Frontend Stack:** Next.js 14+ (App Router), React, TypeScript, Tailwind CSS, Lucide Icons, Shadcn UI / Radix Primitives  

---

## 1. Design Philosophy & Visual Principles

GoFlow's user interface is crafted to prioritize **utility, clarity, speed, and real-time responsiveness**. It avoids superficial fluff, purple-on-dark cliches, or decorative bloat in favor of a sleek, high-density productivity workspace reminiscent of modern developer tools (e.g., Linear, GitHub, Vercel).

### Core Design Rules
1. **Function-Driven Design:** Maximum information density with minimal cognitive friction. Keyboard-first navigation shortcuts for rapid task triage.
2. **Harmonious Visual Hierarchy:** High legibility with distinct typographic hierarchy using clean variable fonts (`Inter` / `Geist Sans` for UI, `JetBrains Mono` for workflow condition rules and JSON view).
3. **Dynamic Real-Time States:** Instant optimistic updates for task status dragging, workflow toggles, and live WebSocket notification toasts.
4. **Accessible & Responsive Layout:** Fully fluid layouts scaling cleanly from desktop multi-column Kanban boards to mobile single-pane lists.

---

## 2. Design System & Theme Tokens

### 2.1 Color Palette (Modern Dark / Light System)

GoFlow uses curated, accessible HSL color variables supporting dark and light themes.

#### Dark Theme Palette (Default for Engineering Portfolio)
- **Background Layer 0 (Canvas):** `hsl(350, 25%, 5%)` `#0e090a`
- **Background Layer 1 (Cards & Sidebars):** `hsl(350, 20%, 9%)` `#1b1315`
- **Background Layer 2 (Hover States & Modals):** `hsl(350, 18%, 15%)` `#2c1e22`
- **Border / Divider Neutral:** `hsl(350, 15%, 25%)` `#483439`
- **Foreground Primary Text:** `hsl(0, 0%, 98%)` `#fafafa`
- **Foreground Secondary Text:** `hsl(350, 10%, 68%)` `#b5a8ab`
- **Primary Accent (Cherry Red):** `hsl(348, 85%, 52%)` `#e6193c`
- **Accent Hover:** `hsl(348, 85%, 44%)` `#c41030`

#### Status & Priority Badge Colors
- **TODO / Medium:** Neutral Slate `hsl(215, 16%, 47%)`
- **IN_PROGRESS / Low:** Cyan/Sky `hsl(199, 89%, 48%)`
- **BLOCKED / Urgent:** Amber/Orange `hsl(38, 92%, 50%)`
- **COMPLETED / High:** Emerald/Green `hsl(142, 71%, 45%)`
- **ARCHIVED:** Muted Zinc `hsl(240, 5%, 34%)`

---

## 3. UI Component Architecture & Layout Wireframes

GoFlow UI is structured into standard layout regions:

```
+-----------------------------------------------------------------------------------+
|  [Logo] GoFlow   [Search Task (Cmd+K)]        (Live WS Status:🟢)  [Avatar/Notif]  |
+-----------------------------------------------------------------------------------+
| SIDEBAR        | MAIN WORKSPACE HEADER                                            |
|                | Project: Alpha Workflow  [+ New Task]  [Workflow Rules (3)]       |
| - Dashboard    +------------------------------------------------------------------+
| - My Tasks     | BOARD VIEW | LIST VIEW | WORKFLOWS | ANALYTICS                   |
| - Notifications|------------------------------------------------------------------|
|                |                                                                  |
| PROJECTS       | +---------------+  +---------------+  +---------------+          |
| > Project Alpha| | TODO (3)      |  | IN PROGRESS(2)|  | COMPLETED (8) |          |
| > Project Beta | |               |  |               |  |               |          |
|                | | [Task Card A] |  | [Task Card B] |  | [Task Card C] |          |
| WORKFLOWS      | | [Task Card D] |  |               |  |               |          |
| > Auto-Assign  | +---------------+  +---------------+  +---------------+          |
| > Due Reminder |                                                                  |
+-----------------------------------------------------------------------------------+
```

### 3.1 Page Specifications

#### 1. Authentication (`/login`, `/register`)
- Clean centered card container over subtle dark mesh backdrop.
- Form controls with inline real-time validation error alerts.
- Smooth transition between password login and password reset request.

#### 2. Project Kanban & List Board (`/projects/[id]`)
- **Drag-and-Drop Column Board:** Columns representing task statuses (`TODO`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`).
- **Interactive Task Cards:** Shows title, priority icon badge, due date badge, assignee avatar, subtask completion bar (`2/5`), and tag pills.
- **Quick Filters Bar:** Instant client-side text filter, priority dropdown, tag filter, and assignee filter.

#### 3. Workflow Builder & Inspector (`/projects/[id]/workflows`)
- **Rule Construction Form:** Step-by-step interactive builder for `WHEN -> CONDITION -> ACTION` rules.
  - *Trigger Selector Dropdown:* `Task Created`, `Status Changed`, `Due Date Approaching`.
  - *Condition Builder:* Clause adder (`IF [Field] [Comparator] [Value]`) with AND/OR logic toggles.
  - *Action Builder:* Action selector (`Create Task`, `Send Notification`, `Update Status`).
- **Execution History Table:** Status badge (`SUCCESS`, `FAILED`, `SKIPPED`), triggered event description, duration ($ms$), execution timestamp, and expandable JSON diagnostic payload log.

#### 4. Notification Drawer & Real-Time Toasts
- **Real-Time Toast Notifications:** Slide-in toasts fired when WebSockets receive `notification.received` or `task.updated` events.
- **Notification Drawer:** Dropdown panel listing unread notifications with quick "Mark as Read" actions and direct deep-links to associated tasks.

---

## 4. Key User Flow Wireframes & Interactions

### 4.1 Workflow Creation Flow

```
[ Click "+ New Workflow" ]
            |
            v
[ Step 1: Select Trigger ]
   (e.g., WHEN Task Status becomes "COMPLETED")
            |
            v
[ Step 2: Add Conditions (Optional) ]
   (e.g., IF Priority EQUALS "HIGH")
            |
            v
[ Step 3: Define Actions ]
   (e.g., THEN Send Notification to Assignee AND Create Task "Verification")
            |
            v
[ Save & Activate Workflow ]
   (Instantly persisted via POST /api/v1/workflows and activated)
```

---

## 5. Summary of Frontend Engineering Standards

- **State Management:** React Query (TanStack Query) for server-state caching and invalidation, combined with Zustand for client UI state (sidebar collapse, theme, active drawer).
- **Form Management:** React Hook Form + Zod for strict client-side validation schema matching backend Go payload specs.
- **WebSocket Integration:** Custom `useWebSocket` hook with automatic reconnection, heartbeat management, and query cache invalidation on incoming events.
