# ♛ FestFlow — College Fest Registration & Event Management Platform

A full-stack platform that lets colleges run their entire fest registration online — with real-time seat tracking, team management, and a concurrency-safe booking engine that never oversells a slot.

---

## Live Demo

> Frontend: [project-bg46m.vercel.app](https://project-bg46m.vercel.app)
> Backend API: [festflow-api-7yk6.onrender.com](https://festflow-api-7yk6.onrender.com)

*Note: the backend is on Render's free tier and may take 30-60 seconds to wake up on first request after a period of inactivity.*

---

## The Problem It Solves

Every college fest has the same chaos. GDSC opens registrations for a 60-team hackathon. The Google Form link drops in 12 WhatsApp groups simultaneously. Within 4 minutes, 340 teams have submitted. Nobody knows who got in. The coordinators spend the next 3 hours manually deduplicating a spreadsheet. Three teams show up on the day and find out they weren't actually registered.

FestFlow replaces that entire mess.

---

## Features

### For Students
- Sign up and log in with email/password or **Google OAuth**
- Browse all events in a fest with real-time seat availability
- Register solo for individual events
- Create a team, receive an invite code, have teammates join via that code
- Register the whole team for a team event in one action
- Get automatically blocked from registering for two events at the same time slot
- Join a waitlist if an event is full
- View and manage all registrations and team memberships in one place
- Cancel a solo registration or withdraw a team's registration (leader only)

### For Admins
- Create and manage fests
- Create events — set capacity, time slot, venue, event type (solo/team)
- View registrations across all events

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

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + Vite | Dynamic SPA with real-time state updates |
| Admin Panel | EJS | Server-rendered, form-heavy, no SPA needed |
| Backend | Node.js + Express | REST API + Socket.io server |
| Database | PostgreSQL | Row-level locking, OVERLAPS queries, ACID transactions |
| Real-time | Socket.io | Live seat count updates across all clients |
| Auth | JWT + bcrypt + Passport (Google OAuth) | Stateless auth, password or one-click Google login |
| DB Host | Supabase | Free managed PostgreSQL |
| Frontend Host | Vercel | Auto-deploys from GitHub |
| Backend Host | Render | Free Node.js hosting |

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

---

## Project Structure

```
festflow/
├── client/                  # React SPA (Vite)
│   ├── vercel.json          # SPA rewrite rules for client-side routing
│   └── src/
│       ├── components/      # Navbar, EventCard, SeatCounter
│       ├── pages/           # BrowseEvents, EventDetail, Login, Register,
│       │                    # MyRegistrations, OAuthSuccess
│       ├── context/         # AuthContext, SocketContext
│       └── index.css        # Design system — Era of Crowns theme
│
└── server/                  # Node.js + Express
    ├── config/              # passport.js — Google OAuth strategy
    ├── routes/               # auth, events, registrations, teams, admin
    ├── services/             # registrationService (concurrency logic), waitlistService
    ├── middleware/           # auth (JWT), roles, errorHandler
    ├── db/                   # pool.js (pg connection), schema.sql
    └── views/                # EJS admin panel templates
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

### 6. Run locally

```bash
# Terminal 1 — start the server
cd server
node index.js

# Terminal 2 — start the React app
cd client
npm run dev
```

Open `http://localhost:5173`

---

## Deployment

- **Backend → Render**: Root directory `server`, build command `npm install`, start command `node index.js`. Add all server `.env` variables in the Render dashboard.
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

### Events
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/events` | Get all events with seat counts |
| GET | `/api/events/:id` | Get single event detail |
| POST | `/api/events` | Create event (admin only) |

### Registrations
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/registrations` | Register for an event (solo only) |
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

---

## Key Design Decisions

**Why PostgreSQL over MongoDB?**
MongoDB cannot do row-level locking or range overlap queries natively. The concurrency problem and the time slot conflict problem both require features that only a relational database with proper ACID transactions provides.

**Why raw SQL over an ORM?**
Using `pg` directly means every query is readable, debuggable, and explainable. There is no abstraction layer hiding what actually runs against the database. This matters especially for the `SELECT FOR UPDATE` transaction where the exact SQL is the point.

**Why React for students and EJS for admins?**
The student-facing app needs dynamic, real-time UI — seat counts update live, team membership changes instantly. React's component model handles this cleanly. The admin panel is form-heavy and used by 2-3 people per fest. Server-rendered EJS is simpler to build, faster to load, and perfectly adequate for the use case.

**Why Socket.io over polling?**
Polling would mean every client hitting the server every few seconds to check seat counts. With 500 students on the browse page during peak registration, that is 500 requests every few seconds for data that only changes on registration events. Socket.io pushes updates only when something actually changes.

**Why add Google OAuth as an addition rather than a replacement?**
Email/password with bcrypt was already a complete, secure auth flow wired into every protected route. Replacing it outright would mean reworking every route for no functional gain. Instead, Google OAuth was added as a second path into the same `users` table and the same JWT issuance — existing accounts are untouched, and a user who signs up with email first and later uses Google with the same address gets their accounts linked rather than duplicated.

---

## What I Would Add at Scale

| Problem | Solution |
|---|---|
| 10,000 concurrent users hammering seat counts | Cache counts in Redis, invalidate on registration |
| Multiple services reacting to one registration event | Kafka to fan out to email service, analytics service |
| Rate limiting registration spam | Redis-based rate limiter per user |
| Registration confirmation emails | Nodemailer with Resend/Brevo SMTP |
| Cold starts on free-tier hosting | Move to a paid tier or add a keep-alive ping |

---

## Author

**Nandini Nautiyal**
NSUT Delhi
[github.com/nandininautiyal](https://github.com/nandininautiyal)

---

*Built with PostgreSQL row-level locking, Socket.io, Google OAuth, and an unhealthy obsession with not overselling hackathon slots.*