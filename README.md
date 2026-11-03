# Local bug testing

This is one Git repository rooted in this directory. `frontend/`, `backend/`,
`gateway/`, and `microservices/` are regular folders, not submodules or separate
repositories. Open this root folder in your editor and run Git commands here.
Each service keeps its own package.json and lockfile for independent dependency
installation and future Docker builds; that does not make it a separate Git repo.
The root `docker-compose.yml` coordinates the services.

The app uses React on port 3000 and an Express API on port 5000.
The gateway runs on 8000, notifications on 4002, and the stock service on 4003.
The separate auth-gateway folder is an unused placeholder.

## Run everything with Docker

Prerequisites: Docker Engine (or Docker Desktop) and Docker Compose v2 or later.
Node.js is not required on the host.

1. Copy `.env.example` to `.env` (preserve any existing local configuration).
2. Set `JWT_SECRET` to a random value, for example using `openssl rand -hex 32`.
3. Start the stack from this directory:

```bash
docker compose up --build -d --wait
```

Open http://localhost:3000. Nginx serves the production React bundle, handles
client-side routes, and proxies `/api` to the backend. The frontend uses relative
API URLs in Docker, so it also works when accessed from another computer.
For local React development the default API remains http://localhost:5000/api;
`REACT_APP_API_BASE_URL` can override it at build/start time.

Compose starts MongoDB, notifications, stock management, gateway, backend, and
frontend in dependency order, waiting for health checks. Backend readiness also
checks the database connection. Internal calls use Compose service names.
API/debug ports 5000, 8000, 4002, 4003 and MongoDB port 27018 are bound to
localhost; the UI is exposed on port 3000. Stop local Node processes before
starting Docker to avoid port conflicts. The empty `auth-gateway/index.js` is an
unused placeholder, with no server to run.

Compose reads the root `.env`, not service-local environment files. Gmail
credentials are optional and default to empty. Without them, notification requests
fail and checkout logs that failure while still saving the order. The existing
hardcoded checkout email recipient remains in `backend/controllers/orderController.js`.
Credentials are excluded from every image build context; application Node
containers run as the non-root `node` user with production dependencies.

```bash
docker compose ps                    # service health
docker compose logs -f              # follow logs
docker compose down                 # stop and remove containers, keep data
docker compose up --build -d --wait  # rebuild after code changes
```

MongoDB 8.0 uses `GLIBC_TUNABLES=glibc.pthread.rseq=1` for compatibility with
newer Linux kernels; see the [MongoDB image issue](https://github.com/docker-library/mongo/issues/765).
MongoDB data persists in the `mongo-data` named volume. `docker compose down -v`
**deletes that database**. A database from an older container or a host MongoDB
installation is not automatically migrated to this new volume.

Optional sample data (**replaces all products**):

```bash
docker compose exec backend node seeder.js
```

Register a user in the UI, then log in and test products, cart, and checkout.
No admin account is seeded. The stock service currently only logs updates, and
the checkout stock call remains commented out.

## First setup for local Node development

Run from the repository root:

```bash
npm ci
npm run install:all
npm run db:start
```

`db:start` starts only MongoDB from Compose, exposed on localhost:27018.
The root `.env` must include `JWT_SECRET` for Compose configuration validation.

## Start all application services

```bash
MONGO_URI=mongodb://127.0.0.1:27018/exam1Db npm run run:all
```

Open http://localhost:3000. `npm run start:all` is an alias for the same launch.
Press Ctrl+C to stop the application services. MongoDB stays running; stop it
with `docker compose stop mongo`.

Each service starts in its own directory and loads its local `.env`.
The backend needs `MONGO_URI` and `JWT_SECRET` in `backend/.env`.
The gateway needs `NOTIFI_SERVICE_URL=http://localhost:4002` and
`STOCK_SERVICE_URL=http://localhost:4003` in `gateway/.env`.
If you already run MongoDB on 27017, omit the MONGO_URI override and use your
backend configuration instead.

Notifications use the Gmail credentials in `microservices/notifications/.env`;
checkout sends to a hardcoded recipient in `backend/controllers/orderController.js`.
For testing without sending email, launch with blank credentials:

```bash
EMAIL_USER= EMAIL_APPLICATION_PASSWORD= MONGO_URI=mongodb://127.0.0.1:27018/exam1Db npm run run:all
```

Email failures are logged but do not prevent order creation.

## Optional product data

The seeder **deletes all existing products** before inserting five examples.
Use only with a disposable test database:

```bash
cd backend
MONGO_URI=mongodb://127.0.0.1:27018/exam1Db node seeder.js
```

Register a user through the UI, log in, then test products, cart, and checkout.
There is no seeded admin account. The stock microservice only logs requests;
it does not update MongoDB, and its checkout call is commented out.
