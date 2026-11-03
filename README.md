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

## First setup

Run from the repository root:

```bash
npm ci
npm run install:all
npm run db:start
```

`db:start` starts only MongoDB from Compose, exposed on localhost:27018.
The other Compose services cannot build because their Dockerfiles are missing.

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
