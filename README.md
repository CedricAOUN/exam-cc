# MERN shop exam project

This is one Git repository. The application contains a React frontend, Express
backend, gateway, notification service, stock service, and MongoDB. The empty
`microservices/auth-gateway/index.js` is an unused placeholder.

## Run with Docker

Requires Docker and Docker Compose **2.24.4 or later** (the isolated test stack
uses Compose's `!reset` syntax). Node.js is not required on the host.

1. Copy `.env.example` to `.env`, preserving any existing configuration.
2. Generate **two independent secrets**, using `openssl rand -hex 32` twice, and
   set `JWT_SECRET` and `SERVICE_TOKEN`. Each must be at least 32 characters.
3. Start the stack:

```bash
docker compose up --build -d --wait
```

Open http://localhost:3000. Nginx serves the production React build, handles SPA
routes, and proxies `/api` to the backend. Set `ALLOWED_ORIGINS` to the exact UI
origins when accessing the app using a different hostname. The default includes
`http://localhost:3000` and `http://127.0.0.1:3000`.

```bash
docker compose ps
docker compose logs -f
docker compose down                 # stop containers, preserve database
docker compose up --build -d --wait  # apply source/config changes
```

API/debug ports 5000 (backend), 8000 (gateway), 4002 (notifications), 4003 (stock),
and 27018 (MongoDB) are bound to localhost. Only the UI on port 3000 is publicly
bound. Internal endpoints require `X-Service-Token`; browser clients use the
backend API and never receive that secret. Stop host Node processes before
starting Docker to avoid port conflicts.

Compose reads the root `.env` and explicitly supplies container settings; it does
not use service-local `.env` files. Application Node containers run as non-root
with production dependencies, and secrets are excluded from image build contexts.

MongoDB runs as a **single-node development replica set**, enabling atomic order
and stock transactions. Health checks initialize it and wait for a writable
primary. Existing named-volume data is preserved when enabling the replica set.
MongoDB uses `GLIBC_TUNABLES=glibc.pthread.rseq=1` for the
[kernel compatibility workaround](https://github.com/docker-library/mongo/issues/765).
Data persists in `mongo-data`; **`docker compose down -v` deletes it**. Data from
older anonymous volumes or host MongoDB installations is not automatically migrated.

This Compose setup is for local development/preproduction validation. Before an
internet deployment, configure HTTPS and `COOKIE_SECURE=true`, restrict network
access, and provision authenticated MongoDB with backups and appropriate secrets
management. Production hosting and monitoring are separate exam tasks.

## Accounts, checkout, and notifications

Register through the UI with a username of 3-40 letters/digits/underscores/hyphens,
a lowercase email address, and a password of 12-72 characters (maximum 72 UTF-8
bytes). Registration always creates a `user`. No administrator account is seeded;
use the administrator credentials/database dump supplied for the exam.

Login stores a one-hour JWT in an HttpOnly, SameSite cookie. The frontend checks
`GET /api/auth/me` to restore the session. Authenticated writes require the
session's `X-CSRF-Token`. Logout revokes all existing sessions for that user.
Old localStorage credentials are removed; log in again after upgrading.

Checkout sends product IDs and integer quantities; prices and totals are
calculated from MongoDB. Each attempt includes an `Idempotency-Key`, retained by
the UI for retries of the same payload. Retrying the same key returns the same
order without deducting stock again. Reusing it with different data returns 409.
Orders and stock reservations commit together. Cancellations retain order history
and restore reserved stock once; legacy orders without reservations do not add
stock on cancellation.

Users can list their own orders and cancel their own pending orders. Admins can
list all orders, validate them, update status, cancel pending/processing orders,
and set product stock (including zero) through the stock service. Supported status
transitions are pending -> processing -> shipped -> delivered, or cancellation
before shipment. In French: `En attente`, `En cours de traitement`, `Expédiée`,
`Délivrée`, `Annulée`.

Email is optional. Without both `EMAIL_USER` and `EMAIL_APPLICATION_PASSWORD`, the
notification service validates requests and returns 202 with `delivered: false`.
Configure Gmail application credentials to enable real delivery. Order emails go
to the account's email, and stock emails go to optional `NOTIFICATION_EMAIL`.
Notification failures never roll back a completed database operation. Email is
best effort; durable retries/outbox delivery are not yet implemented.

Optional sample data (**deletes and replaces all products**):

```bash
docker compose exec backend node seeder.js
```

Use the seeder only on a disposable database without live orders.

## Host-side Node development

Requires Node.js **22.22.2+ (or 24.15+/26+)**. Keep the same secrets and local service URLs in the
root `.env`; root startup scripts load that file before any service-local values.
Start only the database to avoid conflicting ports:

```bash
npm ci
npm run install:all
npm run db:start
EMAIL_USER= EMAIL_APPLICATION_PASSWORD= MONGO_URI='mongodb://127.0.0.1:27018/exam1Db?replicaSet=rs0&directConnection=true' npm run start:all
```

`npm run run:all` is an alias. Ctrl+C stops the application processes; stop the
database with `docker compose stop mongo`. A standalone MongoDB instance cannot
run transactional checkout; use a replica set.

Vite serves React on port 3000 and proxies `/api` to host port 5000. For a custom
API endpoint, set `VITE_API_BASE_URL` when starting/building the frontend, and
configure CORS/origins and the deployed CSP accordingly. The default relative
`/api` works for both Vite and Docker.

## Logging

The backend, gateway, notifications, and stock service use
[Winston](https://github.com/winstonjs/winston). JSON logs go to stdout (errors to
stderr), so Docker collects them without writable log files inside containers.
Each entry has a timestamp, service name, level, and message. HTTP completion logs
include method, route template, status, and duration in milliseconds. Successful
health checks are omitted; failed health checks are recorded.

```bash
docker compose logs -f backend gateway notifications stock-management
docker compose logs --since 10m backend
```

Set `LOG_LEVEL=info` in the root `.env` to control the minimum level (`error`,
`warn`, `info`, `http`, `verbose`, `debug`, or `silly`); the default is `info`.
Recreate the Node containers after changing it, or restart host-side Node
processes. Invalid level names fall back to `info`.

Logging records operational metadata rather than request bodies, headers, query
strings, raw URLs, credentials, email contents, or error stacks. Unknown metadata
fields are discarded. Pass static messages and approved metadata to the logger;
never interpolate secrets into a message. The seeder also uses Winston and drains
its output before finishing. Central log storage, retention, and alerting remain
separate deployment work.

## Checks

```bash
npm test                   # backend validation and frontend regression tests
npm run lint               # all server sources and frontend
npm run format:check       # Prettier
npm run test:integration    # isolated Docker stack and full HTTP/DB regression suite
```

Integration tests use the separate `exam1-audit-test` Compose project, no published
host ports, a separate database, and disabled email. They cover cookie sessions,
CSRF, authorization, input validation, transactional rollback, concurrent checkout,
idempotent retries, order transitions/cancellation, stock persistence, internal
service authentication, rate limiting, and frontend proxy routing. Fixtures are
removed after testing; the test containers stop when the suite finishes.

Remove only the isolated test resources when finished:

```bash
docker compose -p exam1-audit-test -f docker-compose.yml -f docker-compose.test.yml down -v
```

See [the audit report](docs/security-audit.md) for findings, verification results,
and remaining deployment work. The changelog is maintained separately from this report.
