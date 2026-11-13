# CourtFlow

CourtFlow is a mobile-first, local sports queue for open-play courts. Players scan a session QR code, join with a display name, and follow the live FIFO line. Venue staff call the next group, manage courts, and record a reason for queue changes.

The development setup uses free, local software only. It does not call paid APIs, create cloud resources, or require external API keys.

## Project layout

- `apps/web` contains the Vite PWA. Route setup lives in `src/app`, and home, queue, and staff code lives under `src/features`. Reusable UI, browser API helpers, formatters, hooks, and global styles live in `src/shared`.
- `apps/api` contains the NestJS app. Controllers and services are grouped by auth, sessions, queue, courts, matches, and realtime under `src/modules`; PostgreSQL access and setup are under `src/infrastructure/database`.
- `apps/api/database/schema.sql` defines the local PostgreSQL schema. The root `docker-compose.yml` starts the local database.
- `packages/contracts` contains the HTTP and Socket.IO types shared by the web and API workspaces. Runtime request validation remains with the API controllers.

The root npm workspace keeps the existing `dev`, `build`, `test`, `test:integration`, and database commands available from the repository root.

## Requirements

- Node.js 20 or newer
- Docker Desktop with its Linux container engine running, or a local PostgreSQL 15+ server

## Start locally

1. Copy `.env.example` to `.env` in the project root. Set `STAFF_PIN` to a private 8–12 digit PIN and set `SESSION_SECRET` to a private random value with at least 32 characters. The example values are placeholders and the API refuses to start with them. For example, generate a secret with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`.
2. Install the JavaScript dependencies: `npm install`
3. Start the PostgreSQL container: `npm run db:up`
4. Start the API and web app: `npm run dev`
5. Open `http://localhost:5173`. The seeded sample session uses the code `demo`.
6. Open **Venue staff** to sign in with the local PIN from `.env` and manage sessions, courts, and the QR code.

The sample database uses local development credentials from `.env.example`. They are only for a private development machine. Do not reuse them for a public deployment.

## Test from phones on the same Wi-Fi

Open the staff page on the development computer using its private Wi-Fi address instead of `localhost`, for example `http://192.168.1.25:5173/staff`. Use that page’s QR code. Keep the computer and PostgreSQL running, and allow the Node development server through the computer’s private-network firewall if prompted. The QR code is built from the page’s current address, so it will use the LAN address when opened this way.

## Useful commands

```powershell
npm run db:up       # Start local PostgreSQL in Docker
npm run db:setup    # Create tables and the demo session
npm run dev         # Start API and Vite web app
npm run test        # Run rule and security checks
npm run test:integration # Run PostgreSQL-backed queue smoke tests
npm run build       # Type-check and build both apps
npm run db:down     # Stop the local PostgreSQL container
```

The API listens on `127.0.0.1:3001`; Vite listens on port `5173` and proxies API and Socket.IO traffic locally. Docker exposes PostgreSQL on local port `5433` (container port `5432`) to avoid clashes with an existing local database, bound to loopback only. PostgreSQL data persists in the `court-flow-postgres` Docker volume. If you use a native PostgreSQL server, set `DATABASE_URL` in `.env` to its port.

For LAN phone testing, set `WEB_ORIGINS` to the exact origin shown in the phone browser, such as `http://192.168.1.25:5173`. The API and database remain reachable only from the development computer; Vite proxies phone traffic and forwards the client IP. The local API trusts that one Vite hop so rate limits remain per phone. For another reverse-proxy setup, set `TRUST_PROXY_HOPS` to the exact number of trusted proxy hops. Never trust forwarded client IP headers directly from the public internet.

Production startup requires explicit HTTPS `WEB_ORIGINS`, a non-placeholder secret and PIN, and a database URL that does not use the sample `postgres` password. Set `API_HOST` to an interface reachable only by the trusted proxy if the API runs in a separate container; the default is loopback. Database setup skips creating the predictable `demo` session and closes any existing demo session in production. The web build includes `public/_headers` for static hosts that support that convention, and Vite dev/preview sends the same Content Security Policy, frame, MIME-sniffing, referrer, and permissions headers. Configure equivalent response headers on other production hosts. HTTP and realtime rate limits are held in process memory, so a multi-instance deployment should also enforce shared limits at its trusted proxy.

`npm run test:integration` requires the local PostgreSQL container to be running. It creates a temporary queue session, exercises parallel check-ins, duplicate staff calls, withdrawals, requeue, skips, and reasoned reordering, then deletes the temporary session.

## Queue behavior

- Players join one at a time and receive a stable local browser identity for this session.
- The next two or four waiting players are selected in FIFO order when staff calls an open court.
- When a game finishes, staff chooses which players want another turn; those players return to the end of the line.
- A player can leave the queue. If they leave while playing, they are removed after the game.
- Staff can skip or move a waiting ticket to the front or back, but must enter a reason. The change appears in the activity record.
- Repeated staff commands with the same idempotency key do not apply twice.

## Local API

- `GET /api/health`
- `GET /api/public/sessions/:code`
- `POST /api/public/sessions/:code/join`
- `DELETE /api/player/me`
- `POST /api/auth/staff`
- `GET /api/staff/sessions` and `GET /api/staff/sessions/:sessionId`
- `POST /api/staff/sessions` and `POST /api/staff/sessions/:sessionId/courts`
- `POST /api/staff/sessions/:sessionId/courts/:courtId/call-next`
- `POST /api/staff/matches/:matchId/complete`
- `POST /api/staff/sessions/:sessionId/tickets/:ticketId/skip`
- `POST /api/staff/sessions/:sessionId/tickets/:ticketId/reorder`

Socket.IO clients join a public session room with `session:join` and receive `session:changed` version notices. Clients reload the API snapshot after a notice or reconnect; the database remains the source of truth.

## No cloud services included

There is no hosted database, domain, SMS, maps, AI, or third-party notification provider in this project. To make the queue available outside the local network later, choose a hosting provider and review its current limits and costs first.
