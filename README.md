# ♛ FestFlow — College Fest Registration & Event Management Platform

A full-stack platform that lets colleges run their entire fest registration online — with real-time seat tracking, team management, multi-fest support, and a concurrency-safe booking engine that never oversells a slot.

---

## Live Demo

> Frontend: [project-bg46m.vercel.app](https://project-bg46m.vercel.app)
> Backend API: [festflow-api-7yk6.onrender.com](https://festflow-api-7yk6.onrender.com)
> Admin Panel: [festflow-api-7yk6.onrender.com/admin/login](https://festflow-api-7yk6.onrender.com/admin/login)

*Note: the backend is on Render's free tier and may take 30-60 seconds to wake up on first request after a period of inactivity.*

---

## The Problem It Solves

Every college fest has the same chaos. GDSC opens registrations for a 60-team hackathon. The Google Form link drops in 12 WhatsApp groups simultaneously. Within 4 minutes, 340 teams have submitted. Nobody knows who got in. The coordinators spend the next 3 hours manually deduplicating a spreadsheet. Three teams show up on the day and find out they weren't actually registered.

FestFlow replaces that entire mess — and proves it with an actual concurrency test (see below), not just a claim in a README.

---

## Features

### For Students
- Sign up and log in with email/password or **Google OAuth**
- Browse multiple fests running simultaneously, filtered through a searchable dropdown
- Browse all events in a fest with real-time seat availability
- Register solo for individual events
- Create a team, receive an invite code, have teammates join via that code
- Register the whole team for a team event in one action
- Get automatically blocked from registering for two events at the same time slot
- Get automatically blocked from solo-registering for a team event
- Join a waitlist if an event is full
- View and manage all registrations and team memberships in one place
- Cancel a solo registration or withdraw a team's registration (leader only)

### For Admins
A separate, server-rendered admin panel (EJS) running on the Express server:
- Secure session-based login (separate from the student JWT flow)
- Dashboard with live stats — total events, total registrations, total waitlisted
- Create new fests
- Create new events under any fest — set capacity, time slot, venue, event type (solo/team)
- View the full registration list for any event, including team affiliation and status

---

## The Hard Engineering Problems

### 1. The Concurrency Problem

A hackathon has 50 team slots. Registration opens at 10am. 300 teams click register within the same 30 seconds. Every request reads the database and sees 49 confirmed registrations. Every request concludes there is a free slot. Every request inserts a confirmed registration. You now have 300 confirmed teams for 50 slots.

**FestFlow solves this using PostgreSQL transactions with row-level locking.**

```sql
BEGIN;
SELECT * FROM events WHERE id = $1 FOR UPDATE;  -- locks the row
-- capacity check happens here
INSERT INTO registrations ...;
COMMIT;
```

When a registration request comes in, the database row for that event gets locked for the duration of the transaction. Every other simultaneous request has to wait. The capacity check and the insert happen as one atomic unit. It is physically impossible to oversell.

**This is proven, not just claimed.** `server/test-concurrency.js` is a standalone script that creates 20 users and fires 20 simultaneous registration requests at a test event with only 5 seats:

```bash
cd server
node test-concurrency.js
```

```
Creating 20 test users...
Firing 20 simultaneous registration requests...
--- RESULTS ---
Confirmed: 5
Waitlisted: 15
Failed/Other: 0
Total: 20
✅ PASS — exactly 5 confirmed registrations, no overselling.
```

### 2. The Time Slot Conflict Problem

A student registers for the hackathon from 10am to 6pm, then also registers for a workshop from 2pm to 4pm. Both go through. On the day they cannot attend both.

**FestFlow detects this at registration time using PostgreSQL range overlap queries.**

```sql
SELECT e.name FROM registrations r
JOIN events e ON r.event_id = e.id
WHERE r.user_id = $1
  AND r.status = 'confirmed'
  AND (e.starts_at, e.ends_at) OVERLAPS ($2, $3)
```

If any existing confirmed event overlaps with the new event's time window, the registration is rejected with a clear error. Every student's schedule is conflict-free by design.

### 3. Real-Time Seat Updates

When any student confirms a registration, the available seat count updates live for everyone currently viewing the browse page — no refresh needed. Built with Socket.io: the server emits a `seat_update` event on every confirmed registration, and the React frontend updates state immediately.

### 4. Solo vs Team Registration Integrity

A team event cannot be entered solo, and a solo event has no team flow. This is enforced at the API level, not just hidden in the UI — `POST /api/registrations` checks the event's type server-side and rejects a solo registration attempt on a team event, regardless of what the client sends.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + Vite | Dynamic SPA with real-time state updates |
| Admin Panel | EJS + express-session | Server-rendered, form-heavy, no SPA needed, separate auth from students |
| Backend | Node.js + Express | REST API + Socket.io server + EJS admin routes |
| Database | PostgreSQL | Row-level locking, OVERLAPS queries, ACID transactions |
| Real-time | Socket.io | Live seat count updates across all clients |
| Auth | JWT + bcrypt + Passport (Google OAuth) | Stateless auth for students, password or one-click Google login |
| DB Host | Supabase | Free managed PostgreSQL, RLS enabled on all tables |
| Frontend Host | Vercel | Auto-deploys from GitHub |
| Backend Host | Render | Free Node.js hosting, also serves the admin panel |

---

## Database Schema

```
users          — id, name, email, password_hash (nullable), google_id, role
fests          — id, name, description, created_by
events         — id, fest_id, name, event_type, capacity, starts_at, ends_at, venue
teams          — id, name, event_id, leader_id, invite_code
team_members   — team_id, user_id
registrations  — id, event_id, user_id, team_id, status (confirmed/waitlisted/cancelled)
waitlist       — id, event_id, user_id, position
```

`password_hash` is nullable and `google_id` is unique — this allows a single `users` table to support both email/password accounts and Google OAuth accounts. If a user originally signed up with a password and later signs in with Google using the same email, their existing account is linked rather than duplicated.

`fest_id` on `events` means the platform supports multiple fests running at once. A college's Tech Fest and Cultural Fest can both be live on FestFlow simultaneously, each with their own set of events, and students filter between them on the browse page.

**Security:** Row-Level Security (RLS) is enabled on every table in Supabase with no public policies attached. This blocks Supabase's auto-generated public REST API from reading or writing any data. The application itself is unaffected — the Express server connects with the full database connection string, which bypasses RLS by design, so all normal app functionality (login, registration, admin actions) works exactly as before.

---

## Project Structure

```
festflow/
├── client/                      # React SPA (Vite)
│   ├── vercel.json               # SPA rewrite rules for client-side routing
│   └── src/
│       ├── components/           # Navbar, EventCard, SeatCounter
│       ├── pages/                # BrowseEvents, EventDetail, Login, Register,
│       │                         # MyRegistrations, OAuthSuccess
│       ├── context/              # AuthContext, SocketContext
│       └── index.css             # Design system — Era of Crowns theme
│
└── server/                      # Node.js + Express
    ├── config/                   # passport.js — Google OAuth strategy
    ├── routes/                   # auth, events, registrations, teams, admin
    ├── services/                 # registrationService (concurrency logic), waitlistService
    ├── middleware/                # auth (JWT), roles, errorHandler
    ├── db/                        # pool.js (pg connection), schema.sql
    ├── views/                     # EJS admin panel templates
    │   ├── layout.ejs
    │   ├── admin-login.ejs
    │   ├── admin-dashboard.ejs
    │   ├── admin-new-fest.ejs
    │   ├── admin-new-event.ejs
    │   └── admin-registrations.ejs
    └── test-concurrency.js        # Fires 20 simultaneous registrations at a 5-seat event
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase account (free)
- A Google Cloud project (free, only needed for OAuth)

### 1. Clone the repo

```bash
git clone https://github.com/nandininautiyal/fest-flow.git
cd fest-flow
```

### 2. Set up the database

- Create a new project on [supabase.com](https://supabase.com)
- Go to SQL Editor → paste the contents of `server/db/schema.sql` → Run
- Then run:
  ```sql
  ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
  ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE;

  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE fests ENABLE ROW LEVEL SECURITY;
  ALTER TABLE events ENABLE ROW LEVEL SECURITY;
  ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
  ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
  ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
  ```

### 3. Set up Google OAuth (optional)

- Go to [console.cloud.google.com](https://console.cloud.google.com) → create a project
- Configure the OAuth consent screen (External)
- Create OAuth credentials → Web application
- Add an authorized redirect URI: `http://localhost:5000/api/auth/google/callback` (and your production URL when deployed)
- Copy the Client ID and Client Secret

### 4. Configure environment variables

Create `server/.env`:

```env
DATABASE_URL=postgresql://postgres:[password]@[host].supabase.com:5432/postgres
JWT_SECRET=your_secret_key_here
PORT=5000
CLIENT_URL=http://localhost:5173
SESSION_SECRET=another_random_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000
```

### 5. Install dependencies

```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 6. Create your first admin user

Register a user through the API with `role: "admin"`:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@festflow.com","password":"yourpassword","role":"admin"}'
```

### 7. Run locally

```bash
# Terminal 1 — start the server
cd server
node index.js

# Terminal 2 — start the React app
cd client
npm run dev
```

- Student app: `http://localhost:5173`
- Admin panel: `http://localhost:5000/admin/login`

### 8. Run the concurrency test (optional but recommended)

With the server running in one terminal, create a low-capacity test event via Supabase SQL Editor:

```sql
INSERT INTO events (fest_id, name, description, event_type, capacity, venue, starts_at, ends_at)
VALUES (
  'YOUR_FEST_ID',
  'Concurrency Test Trial',
  'A test event with only 5 seats to verify locking works.',
  'solo', 5, 'Test Chamber', '2026-12-01T10:00:00Z', '2026-12-01T14:00:00Z'
)
RETURNING id;
```

Paste the returned `id` into `EVENT_ID` in `server/test-concurrency.js`, then in a second terminal:

```bash
cd server
node test-concurrency.js
```

---

## Deployment

- **Backend → Render**: Root directory `server`, build command `npm install`, start command `node index.js`. Add all server `.env` variables in the Render dashboard. The admin panel is served directly from this same Render URL at `/admin/login` — it is not part of the Vercel deployment.
- **Frontend → Vercel**: Root directory `client`, framework preset Vite. Add `VITE_API_URL` pointing to your Render URL. `vercel.json` handles SPA routing so direct links to routes like `/oauth-success` don't 404.
- Update `CLIENT_URL` on Render and the Google Cloud authorized redirect URI to match your live URLs once deployed.

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user with email/password |
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/auth/google` | Redirect to Google for OAuth sign-in |
| GET | `/api/auth/google/callback` | Google OAuth callback — issues JWT, redirects to frontend |

### Events & Fests
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/events` | Get all events across all fests, with seat counts |
| GET | `/api/events/:id` | Get single event detail |
| GET | `/api/events/fests/all` | Get all fests (used for the browse page fest filter) |
| POST | `/api/events` | Create event (admin only, via API) |

### Registrations
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/registrations` | Register for an event (solo only — blocked server-side for team events) |
| GET | `/api/registrations/my` | Get my registrations |
| DELETE | `/api/registrations/:id` | Cancel a registration |

### Teams
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/teams` | Create a team |
| POST | `/api/teams/join` | Join a team via invite code |
| GET | `/api/teams/my` | Get all teams I am a member of |
| POST | `/api/teams/:id/register` | Register team for event (leader only) |
| DELETE | `/api/teams/:id/registration` | Withdraw team registration (leader only) |

### Admin (EJS, session-based)
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/admin/login` | Admin login form and handler |
| GET | `/admin/logout` | Destroy admin session |
| GET | `/admin/dashboard` | Stats + list of all events |
| GET/POST | `/admin/fests/new` | Create a new fest |
| GET/POST | `/admin/events/new` | Create a new event under any fest |
| GET | `/admin/events/:id/registrations` | View all registrations for one event |

---

## Key Design Decisions

**Why PostgreSQL over MongoDB?**
MongoDB cannot do row-level locking or range overlap queries natively. The concurrency problem and the time slot conflict problem both require features that only a relational database with proper ACID transactions provides.

**Why raw SQL over an ORM?**
Using `pg` directly means every query is readable, debuggable, and explainable. There is no abstraction layer hiding what actually runs against the database. This matters especially for the `SELECT FOR UPDATE` transaction where the exact SQL is the point.

**Why React for students and EJS for admins?**
The student-facing app needs dynamic, real-time UI — seat counts update live, team membership changes instantly. React's component model handles this cleanly. The admin panel is form-heavy and used by 2-3 people per fest. Server-rendered EJS is simpler to build, faster to load, and perfectly adequate for the use case. It also runs on a completely separate auth mechanism (server-side sessions, not JWT) since admins don't need a stateless API client — they're using a traditional browser session against the same server that renders their pages.

**Why Socket.io over polling?**
Polling would mean every client hitting the server every few seconds to check seat counts. With 500 students on the browse page during peak registration, that is 500 requests every few seconds for data that only changes on registration events. Socket.io pushes updates only when something actually changes.

**Why add Google OAuth as an addition rather than a replacement?**
Email/password with bcrypt was already a complete, secure auth flow wired into every protected route. Replacing it outright would mean reworking every route for no functional gain. Instead, Google OAuth was added as a second path into the same `users` table and the same JWT issuance — existing accounts are untouched, and a user who signs up with email first and later uses Google with the same address gets their accounts linked rather than duplicated.

**Why support multiple fests instead of one?**
A college doesn't run just one fest a year — there's often a tech fest and a cultural fest, sometimes overlapping. Hardcoding a single fest would mean rebuilding the platform for every new fest. Adding `fest_id` as a foreign key and a fest filter on the browse page lets the same deployment serve any number of fests indefinitely, with no schema or code changes needed to launch a new one — just a form submission in the admin panel.

**Why enable RLS with no policies instead of writing policies?**
The Express server is the only intended access path to the database — it connects via the full Postgres connection string, not Supabase's client SDK, so RLS doesn't gate it. Enabling RLS with zero policies fully closes Supabase's public REST API (which uses the anon key) without requiring policy logic that the app doesn't actually need.

---

## What I Would Add at Scale

| Problem | Solution |
|---|---|
| 10,000 concurrent users hammering seat counts | Cache counts in Redis, invalidate on registration |
| Multiple services reacting to one registration event | Kafka to fan out to email service, analytics service |
| Rate limiting registration spam | Redis-based rate limiter per user |
| Registration confirmation emails | Nodemailer with Resend/Brevo SMTP |
| Cold starts on free-tier hosting | Move to a paid tier or add a keep-alive ping |
| Admin panel growing past 2-3 fest organizers | Role-based permissions (per-fest admin scoping, coordinator role for individual events) |
| Waitlist promotion on cancellation | Auto-promote next-in-line waitlisted user inside the same cancellation transaction |

---

*Built with PostgreSQL row-level locking, Socket.io, Google OAuth, a server-rendered admin panel, an actual concurrency test proving it all works, and an unhealthy obsession with not overselling hackathon slots.*