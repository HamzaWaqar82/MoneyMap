# MoneyMap — AWT Midterm Lab

Full-stack personal finance dashboard (Node.js/Express 5 + React 19/Vite 8 + MongoDB).

## Commands

```bash
# Backend (repo root)
npm install
npm run dev          # nodemon on src/app.js → localhost:5000
npm start            # node src/app.js

# Frontend
cd frontend && npm install && npm run dev   # Vite dev server → localhost:3000 (proxies /api → :5000)
cd frontend && npm run build                # Production build

# Tests (all use --forceExit --detectOpenHandles)
npm test               # full suite
npm run test:unit      # CSV parsers, categorization, notificationTrigger
npm run test:integration  # expense tracker API, notifications API
npm run test:regression   # core API backward compat
npm run test:uat          # user journeys
npm run test:coverage
```

## Architecture

- **Entrypoint**: `src/app.js` — connects DB, seeds categories, starts cron, listens on PORT (default 5000)
- **Models** (8): User, Transaction, Budget, SavingsGoal, Notification, Account, Category, MonthlySummary
- **All DB queries scoped** to `req.user.id` — ownership enforced at controller level
- **API response format**: `{ success, message, data }` on success; `{ success, message, errorCode, details }` on error
- **Auth**: Bearer JWT in `Authorization` header; token stored in `localStorage` key `moneymap_token`
- **Dual category system**: legacy enum (manual transactions/budgets) + Category collection (CSV import)
- **Rate limit**: 100 req/15min (10,000 in `NODE_ENV=development`)
- **Cron jobs** (skipped when `NODE_ENV=test`): notificationCron (daily 10AM goal reminders), accountDeletionCron

## Testing Quirks

- **Integration tests connect to real MongoDB** — no mocking. Requires a running MongoDB instance.
- Integration tests use `jest.setTimeout(60000)` and poll for DB connection readiness
- All test suites use `--forceExit --detectOpenHandles` to handle Mongoose connections
- No frontend tests exist

## Notifications (3 channels)

| Channel | Severity | Setup |
|---------|----------|-------|
| In-app | All | Always on |
| Web Push | warning, high | VAPID keys in .env (defaults auto-generated for dev) |
| Email | high only | SMTP vars in .env (Ethereal default for dev) |

**Triggers**: Budget crosses 80% or 100% threshold → alert; Rs. >= 50,000 expense → confirmation; goal reminders via cron.

## Environment Variables

`.env.example` uses `MONGO_URI` and `PORT=3000`. Actual `.env` uses `MONGODB_URI` and `PORT=5000`. Prefer the actual `.env` format:
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://...
JWT_SECRET=...
JWT_EXPIRY=7d
CORS_ORIGIN=http://localhost:3000
```

VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, SMTP_* are optional.

## Key Gotchas

- `.env.example` has outdated key names (`MONGO_URI`, `PORT=3000`) — use actual `.env` format
- Frontend Vite config proxies `/api` and `/health` to `localhost:5000`
- Profile DELETE uses `api.deleteWithBody(url, body)` (password in body required)
- Postman collection at repo root
