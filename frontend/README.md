# React frontend

This frontend uses React, React Router, Axios, Tailwind CSS, and Vite. See the
[root README](../README.md) for full-stack setup, authentication, and Docker usage.

Requires Node.js 22.22.2+ (or 24.15+/26+).

```bash
npm ci
npm start          # http://localhost:3000; proxies /api to localhost:5000
npm run build      # production output in dist/
npm test           # Vitest + React Testing Library
npm run lint
npm run format:check
```

Sessions live in an HttpOnly cookie; identity and CSRF state remain in memory and
are restored through `/api/auth/me`. No JWT is stored in localStorage. To use a
custom API endpoint, set `VITE_API_BASE_URL` at start/build time and configure the
backend's allowed origins. Prefer the default relative `/api` endpoint.
