# Learning Platform

Full-stack web learning platform: React frontend, Node.js/Express backend,
Supabase PostgreSQL + Auth + Realtime, and WebRTC voice chat with
Socket.IO signaling.

```
learning-platform/
├── database/
│   └── schema.sql        # tables, constraints, indexes, RLS policies
├── backend/               # Express REST API + Socket.IO realtime layer
└── frontend/               # React app (Vite)
```

## 1. Set up Supabase

1. Create a project at https://supabase.com.
2. Open the SQL editor and run `database/schema.sql` in full. This creates
   all tables, enums, indexes, RLS policies, and a trigger that
   auto-creates a `profiles` row (defaulting to role `student`) whenever a
   new `auth.users` row is inserted.
3. In **Project Settings → API**, copy:
   - `Project URL`
   - `anon` public key
   - `service_role` key (⚠️ server-side only, never in the frontend)
4. In **Table Editor → messages** (and any table you want live updates
   for), make sure **Realtime** is enabled (Database → Replication →
   toggle `messages` on). The schema also works without this, but live
   chat push relies on it.
5. To create your first Manager account: register normally through the
   app (creates a `student`), then in the SQL editor run:
   ```sql
   update profiles set role = 'manager' where email = 'you@example.com';
   ```
   From then on, that Manager can promote other users to `teacher` or
   `manager` from the Manager Dashboard.

## 2. Backend

```bash
cd backend
cp .env.example .env   # fill in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev             # nodemon, http://localhost:4000
```

The backend is the enforcement point for every authorization rule in the
spec (room access, course ownership, role checks) — it never trusts a
role or permission claimed by the client. Supabase RLS is a second,
independent layer of defense on top of that.

## 3. Frontend

```bash
cd frontend
cp .env.example .env    # fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm install
npm run dev              # http://localhost:5173
```

## 4. Try it out

1. Register 2-3 accounts (they'll all start as `student`).
2. Promote one to `teacher` and one to `manager` via SQL or the Manager
   Dashboard.
3. As the teacher: create a course, create a room for it.
4. As the student: register for the course, open the room, join voice,
   send chat messages.
5. As the manager: view platform-wide users/courses/rooms/attendance,
   and confirm you can enter the room without registering.
6. End the room as the teacher/manager and check the Attendance page —
   students who never joined should show `ABSENT`.

## How the spec's core rules are implemented

| Rule | Where |
|---|---|
| Backend-enforced room access (manager any / teacher own / student registered) | `backend/src/services/access.service.js`, checked in `rooms.controller.js`, `messages.controller.js`, and again in `realtime/socket.js` before a socket may join a room |
| One attendance row per student per room | DB `unique (student_id, room_id)` constraint + `attendance.service.js` upsert logic |
| JOIN/LEAVE always logged separately from attendance | `room_activity_logs` table, written on every socket join/leave in `realtime/socket.js` |
| Re-join doesn't duplicate attendance | `recordJoin()` checks for an existing row before inserting |
| Auto-ABSENT for registered students who never joined | `finalizeAttendanceForRoom()`, triggered by `POST /rooms/:id/end` |
| No trust in client-provided roles | `requireAuth` middleware always re-reads `role` from the `profiles` table using the verified JWT; role changes only happen via the Manager-only `PATCH /users/:id/role` route |
| Voice media never goes through REST | WebRTC peer connections carry audio directly between browsers; the backend only relays small JSON signaling messages over Socket.IO (`voice:signal`) |
| Service-role key never reaches the browser | Only used in `backend/src/config/supabase.js`; frontend only ever uses the `anon` key |

## Known simplifications / next steps

- **Voice chat** uses a full-mesh WebRTC topology (every participant
  connects directly to every other participant), which is simple and
  fine for small class sizes. For larger rooms, swap in an SFU (e.g.
  LiveKit, mediasoup) behind the same `voice:*` socket events.
- No TURN server is configured — add one (Twilio, Cloudflare Calls,
  coturn) for reliable connectivity across restrictive NATs/firewalls in
  production.
- Automatic absence marking currently runs when a teacher/manager clicks
  "End session." For true automatic finalization at the scheduled
  `end_time` even if nobody manually ends it, add a scheduled job
  (Supabase Cron / a `pg_cron` job / a simple backend `setInterval`)
  that calls the same `finalizeAttendanceForRoom` service for rooms past
  their end time.
- UI is intentionally minimal/functional (light corporate-blue theme) —
  no design system, no loading skeletons, no toasts. Straightforward to
  restyle once functionality is validated.
