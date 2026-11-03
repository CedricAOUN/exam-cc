# Application bug and security audit

Date: 2026-11-03. Scope: source review of the frontend, API, gateway, microservices,
Docker configuration, and dependency manifests, with regression checks against an
isolated local stack. Severity describes the original behavior and its potential
impact; it is not a formal CVSS score.

## Findings and implemented fixes

| ID     | Severity | Original finding                                                                                                                                            | Implemented correction                                                                                                                                                                                             |
| ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SEC-01 | Critical | Checkout accepted browser-supplied prices and computed totals from them.                                                                                    | Reject client price/total fields; resolve products and calculate integer-cent totals on the server.                                                                                                                |
| SEC-02 | High     | JWTs were stored in localStorage, and backend permissions depended on JWT role claims.                                                                      | HttpOnly/SameSite cookies, explicit signing algorithm/issuer/audience, one-hour expiry, database-backed identity/role checks on each request, and session revocation on logout.                                    |
| SEC-03 | High     | Passwords, tokens, user records, database URIs, addresses, and notification contents appeared in logs.                                                      | Remove sensitive debug dumps. Return generic login errors and sanitized service errors; hide password hashes by default.                                                                                           |
| SEC-04 | High     | Notification and stock endpoints had no caller authentication.                                                                                              | Require a strong internal service token at the gateway and at each microservice; strip browser cookies/authorization before proxying.                                                                              |
| SEC-05 | High     | Checkout had no stock reservation, allowing overselling, partial operations, and repeated orders on retry.                                                  | Transactional conditional stock deductions and order creation, rollback on any failed item, and a unique per-user checkout key with payload matching.                                                              |
| SEC-06 | High     | API inputs lacked consistent validation, including query objects, negative/fractional quantities, missing addresses, arbitrary statuses, and malformed IDs. | Strict Joi schemas, no coercion, bounded strings/arrays/numbers/body size, and validated status transitions and IDs. Unknown fields are rejected.                                                                  |
| SEC-07 | High     | Dependency locks contained vulnerable server packages and an unmaintained frontend build chain.                                                             | Update server dependencies and transitive locks, migrate React Scripts to Vite/Vitest, update React Router and Nodemailer, replace root watch tooling, and patch ESLint's glob dependency using a scoped override. |
| SEC-08 | Medium   | Authentication lacked request throttling and duplicate-account errors became generic server failures.                                                       | Limit login/register attempts, enforce database unique indexes before startup, and return 409 for duplicates. Registration accepts only ordinary users.                                                            |
| SEC-09 | Medium   | CORS allowed arbitrary origins; cookie authentication would require CSRF protection.                                                                        | Exact origin allowlist, unsafe-origin rejection (including login/register), a random session-bound CSRF token for authenticated writes, and no-store API responses.                                                |
| BUG-01 | High     | Order deletion never replied; validation returned success without saving.                                                                                   | Cancellation responds and retains history, restores reserved stock once, checks ownership/status, and validation persists processing status.                                                                       |
| BUG-02 | High     | The stock service only logged requests.                                                                                                                     | Persist validated absolute stock updates in MongoDB through the authenticated gateway; backend admin authorization remains mandatory.                                                                              |
| BUG-03 | Medium   | Product/order errors could escape Express 4 handlers; notifications could stall checkout or expose internal errors.                                         | Async error wrappers, bounded service/email timeouts, sanitized errors, explicit disabled-email mode, and notifications after database commit.                                                                     |
| BUG-04 | Medium   | Checkout emails used a hardcoded third-party recipient.                                                                                                     | Send order notifications to the account email; use optional configured admin email for stock events.                                                                                                               |
| BUG-05 | Medium   | Cart reducer mutated prior state, select controls displayed values not stored in state, and the admin form mishandled zero/string stock.                    | Immutable cart updates with stock bounds, actual default payment/shipping state, numeric stock validation including zero, and server-returned product state.                                                       |
| BUG-06 | Low      | Product keys used a missing ID, loading failures were unhandled, admin status buttons offered invalid transitions, and shipping URLs were misspelled.       | Use Mongo IDs, handle fetch failures, show valid admin actions, and add a corrected protected shipping route with a legacy redirect.                                                                               |

## Design and compatibility notes

- Sessions are no longer accepted from Bearer headers or localStorage. Existing
  users must log in again. The frontend obtains identity and CSRF state from
  `/api/auth/me`; authorization is always enforced server-side.
- Logout increments a user session version, invalidating all of that user's
  existing cookies. Changing/deleting a user's role/account takes effect on the
  next authenticated request.
- Cookie `Secure` is explicitly configurable so localhost HTTP can work. Set
  `COOKIE_SECURE=true` and exact HTTPS origins for deployed environments.
- The local Nginx proxy overwrites forwarded client addresses. Compose trusts
  private proxy addresses for rate limiting; review `TRUST_PROXY` when changing
  the deployment topology. Do not expose a backend with broad trusted proxies
  directly to the internet.
- The new single-node replica set supports multi-document transactions; it is not
  a highly available production database. Existing named-volume data is retained.
- Admin inventory edits are owned by the stock service. Checkout/cancellation
  inventory changes intentionally remain inside the API's order transaction, so
  stock and order state commit atomically. Fully decentralizing checkout stock
  would need an explicit reservation protocol or saga/outbox design.
- New orders record whether stock was reserved. Cancelling legacy orders that
  predate reservations does not increase inventory. Existing historical inventory
  and orders still need reconciliation against the exam database dump.
- Order cancellation replaces hard deletion to preserve accounting/history.
  Pending orders can be cancelled by their owner; admins may also cancel orders
  being processed. Shipped/delivered orders cannot be cancelled through this API.
- The idempotency key is required on order creation. Replays of an identical
  request return 200 and the existing order; a newly created order returns 201;
  reuse with another payload returns 409. The browser retains the key on failure
  while the same order screen remains mounted.
- Passwords require 12-72 characters and at most 72 UTF-8 bytes, matching bcrypt's
  input limit. Registration does not accept arbitrary role or document fields.
- Build configuration uses `VITE_API_BASE_URL` rather than the former
  `REACT_APP_API_BASE_URL`. Production bundles are emitted to `frontend/dist/`. Updated tooling requires
  Node 22.22.2+ (or 24.15+/26+); Docker uses the Node 22 image.
- The empty auth-gateway remains unused; its locked dependencies were patched too.

## Verification

Verified on 2026-11-03:

- Backend validation checks: passed (3 cases).
- Frontend regression tests: passed (5 cases).
- Docker integration suite: passed (11 scenarios plus the enclosing suite).
- Project-wide lint and formatting checks: passed.
- Frontend production build and all Docker application builds: passed.
- Local Compose deployment: all six services healthy, with real email disabled.
- `npm audit`: zero reported vulnerabilities in all seven package directories,
  including development dependencies and the unused auth placeholder.

A browser UI session was unavailable in this environment; automated DOM tests and
full-stack HTTP/database tests supplied the interaction checks. Real SMTP delivery
was deliberately disabled during verification.

Run the commands in the root README to reproduce verification. Unit tests cover
schema boundaries, cart immutability/stock limits, and protected/admin UI behavior.
The Docker integration suite uses a separate project/database, publishes no host
ports, disables real email, and removes its fixtures.

The integration suite checks:

- Registration validation, duplicate accounts, role injection, and query objects.
- Generic login failures, cookie flags, session restoration, forged/expired
  cookies, database role changes, missing/malformed CSRF, and hostile origins.
- Forged prices/totals, invalid quantities/addresses, and duplicate product rows.
- Rollback of a multi-product order when one item is unavailable.
- Concurrent checkout of the same limited inventory without overselling.
- Concurrent replay of a checkout key, and rejection of key/payload mismatch.
- Order isolation, cancellation, one-time stock restoration, persisted validation,
  allowed status transitions, and malformed object IDs.
- Admin stock updates including zero and persistence through the stock service.
- Unauthorized calls to each internal service, notification validation, disabled
  email behavior, and gateway routing.
- SPA deep links, browser security headers, logout revocation, and auth throttling.

The dependency audit is a point-in-time registry check of the root, frontend,
backend, gateway, and all three microservice folders. Audit counts describe known
package advisories, not proof that the application has no security defects.
The scoped minimatch override moves ESLint/config-array from vulnerable 10.x to
11.x; verify lint when changing these tools or removing the override.

## Remaining work for the exam

1. Provision separate staging/production hosting, exact domain/DNS/HTTPS settings,
   secret storage, authenticated least-privilege MongoDB, backups, and network
   restrictions. The local database still has no authentication and is published
   only on localhost.
2. Configure CI/CD and run lint, unit tests, and isolated integration checks there.
   Container image/OS vulnerability scanning is separate from `npm audit`.
3. Add structured centralized logs, audit trails, monitoring, and alert delivery.
   The current fix removes sensitive logs but does not implement those services.
4. Use a shared rate-limit store when running more than one API instance; current
   counters live in one process and reset on restart.
5. Add durable notification delivery/retries if email delivery must be guaranteed.
   Current delivery is bounded and best effort after commit. Real SMTP delivery
   has not been exercised by automated tests.
6. Consider persistent checkout draft keys across browser refreshes, email
   verification, password recovery, and a controlled admin provisioning process
   if required beyond the supplied exam accounts. The current project records a
   payment method; it does not process actual payments.
7. Reconcile historical inventory/orders, check supplied admin/SMTP access, update
   the changelog from the commits, and capture evidence/screenshots for the final
   submission report.
