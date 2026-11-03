# Changelog

## 2026-11-03

### Investigation

- Reviewed the repository layout, package scripts, environment configuration,
  backend routes, frontend API calls, microservices, and Docker Compose setup.
- Found that `frontend/README.md` contained only the standard Create React App
  documentation, with no project-specific startup instructions.
- Identified missing Dockerfiles for every application service listed with
  `build:` in Compose.
- Identified missing root startup dependencies and a MongoDB port mismatch:
  local environment files use port 27017, while Compose exposes port 27018.
- Confirmed that the separate auth-gateway service is an unused placeholder.

### Local startup

- Added root development dependencies for `nodemon` and `npm-run-all`, and
  updated the root lockfile.
- Changed backend, gateway, notification, and stock startup commands to run
  from their respective directories so they load their local `.env` files.
- Added `npm run run:all` as an alias for the existing `start:all` command.
- Added `npm run install:all` to install locked dependencies for the five
  application services.
- Added `npm run db:start` to start only MongoDB through Docker Compose.
- Installed root and application dependencies locally.
- Updated backend `jsonwebtoken` from 9.0.2 to 9.0.3 and refreshed its lockfile
  to resolve a startup crash in its dependency chain on Node 26.
- Created the root `README.md` with installation and startup instructions,
  service ports, MongoDB configuration, optional product seeding, and a launch
  command with email credentials disabled for bug testing.
- Documented that seeding replaces existing products, checkout uses a hardcoded
  email recipient, no admin account is seeded, and the stock microservice does
  not persist stock changes.

### Single repository cleanup

- Found that `frontend/` had nested Git metadata and was staged as a gitlink
  rather than as source files in the root repository.
- Moved the frontend Git metadata to
  `/tmp/exam1-frontend-git-backup-sdtd_wuq/frontend.git`, preserving its history.
  This is a temporary local backup, not part of the repository.
- Replaced the staged frontend gitlink with 37 regular tracked frontend files,
  including the current local frontend changes.
- Confirmed that the backend already belonged to the root repository.
- Verified that all application folders resolve to the same Git root and no
  gitlinks remain.
- Extended the root `.gitignore` to exclude coverage and Plug'n'Play artifacts.
- Added a root `.dockerignore` to exclude Git metadata, dependencies, generated
  output, environment files, logs, local agent configuration, and data from
  future root Docker build contexts.
- Updated the root README to explain the single repository layout and why
  individual services retain their own package manifests and lockfiles.
- Staged the frontend conversion, ignore rules, and README. No commits or pushes
  were made, and pre-existing unrelated edits were preserved.

### Verification

- Verified JWT signing and verification on Node 26 after the dependency update.
- Built the React production bundle successfully; the build reported an
  existing unused-variable warning in `Register.js` and dependency warnings.
- Briefly launched all five application processes with email credentials
  disabled, then stopped the startup checks.
- Confirmed notification, stock, and gateway listeners, backend HTTP startup,
  and successful frontend development compilation.
- The backend database connection failed with `ECONNREFUSED` on port 27018
  because MongoDB was not running there during verification. Full end-to-end
  testing remains outstanding.
- Verified that local `.env` files, dependency folders, and build output are
  excluded from Git tracking, and that the frontend Git backup exists.

### Remaining setup

- Start MongoDB before using the complete app. With the current Compose port
  mapping, launch the app with
  `MONGO_URI=mongodb://127.0.0.1:27018/exam1Db npm run run:all`.
- Add application Dockerfiles and correct Compose service configuration before
  attempting to run the whole app through Docker Compose. Compose itself has
  not been modified during this session.
- Review existing dependency audit findings separately; no broad dependency
  upgrades or automatic audit fixes were applied.
