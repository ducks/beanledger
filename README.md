# BeanLedger

Coffee roaster production planner. Calculate batch requirements from orders.

## Overview

BeanLedger helps coffee roasters plan production:

- Import orders from CSV (ShipStation, batch exports)
- Manage roast groups (coffee families) and products (SKUs)
- Track leftovers from previous roasts
- Calculate green coffee needed and batches to roast
- Generate pick lists for packaging

## Data Model

- **Roast Group**: Coffee family with shared roast profile (e.g. "Sure Thing", "Nano Genji")
  - Batch type (standard 20.2lb, dark 19.8lb, decaf 10.73lb)
  - Roast loss percentage
  - Type (blend with components, or single origin)

- **Product**: Individual SKU with bag size (e.g. "Woodlawn Blend - 10oz")
  - Belongs to a roast group
  - Weight in pounds

- **Order**: Product + quantity

- **Leftover**: Roasted coffee remaining per group

## Workflow

1. Import orders via CSV
2. Orders aggregate by product → total pounds per roast group
3. Subtract leftovers → needed green coffee
4. Calculate batches to roast (accounting for roast loss)
5. Predict new leftovers after roast

## Tech Stack

- **Frontend**: SvelteKit 5 (with runes)
- **Backend**: SvelteKit server routes
- **Database**: PostgreSQL
- **Auth**: Session-based with scrypt password hashing
- **Testing**: Vitest unit tests for the business logic and CSV parsing; Playwright API and UI tests against a real Postgres, run in CI and before every release
- **Deployment**: Node.js 22, NixOS service

## Accounts

Signing up creates a tenant and its first **owner**. Owners invite others by
email as owner or staff from Settings → Team; staff use the planner but do not
manage accounts. Email verification, password reset, and invitations are
links sent by email, so the server needs a mail transport:

| Variable | Meaning |
|---|---|
| `MAIL_TRANSPORT` | `console` (default, logs the message), `file` (append to `MAIL_OUTBOX`; used by tests), or `smtp` |
| `SMTP_URL` | e.g. `smtps://user:pass@smtp.example.com:465` when `MAIL_TRANSPORT=smtp` |
| `MAIL_FROM` | sender address for SMTP |
| `ORIGIN` | public base URL used in emailed links (already required by adapter-node) |
| `ADDRESS_HEADER` | set to `X-Forwarded-For` behind a reverse proxy so login rate limiting sees the client address |

Failed logins are limited to 10 per 15 minutes per username and per address.
Resetting a password signs out every session for that user.

## Multi-Tenancy

BeanLedger supports multiple roaster companies (tenants) with complete data isolation:
- Each signup creates a new tenant
- Users belong to a tenant
- All data (roast groups, products, orders) is tenant-scoped
- Composite primary keys allow tenants to use same IDs independently

## Development

```bash
# Start PostgreSQL
docker compose up -d

# Apply schema
cat schema.sql | docker exec -i beanledger_db psql -U beanledger

# Seed demo data (optional)
cat seed.sql | docker exec -i beanledger_db psql -U beanledger

# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Run tests
pnpm test              # Unit tests, run once
pnpm test:watch        # Watch mode
pnpm test:ui           # Interactive UI
pnpm test:e2e          # Playwright against a throwaway Postgres (needs Docker)
make check             # Type-check + unit + e2e, the same gate CI runs
```

After upgrading `@playwright/test`, run `pnpm exec playwright install chromium`
once so the matching browser build is present; CI does this on every run.

## Recent Updates

### 2026-03-21
- ✅ **CSV Import Tracking** - Track imported orders separately from manual entries
  - Import history shows filename, timestamp, and order count
  - Delete individual imports to undo mistakes without affecting manual orders
  - Production date picker restricted to today or earlier

### 2026-03-01
- ✅ **Roast Group CRUD UI** - Create, edit, delete roast groups via Catalog modal
- ✅ **Product Edit UI** - Edit product name, weight, and roast group assignment
- ✅ **Test Suite** - Vitest with 14 passing tests covering calc.ts business logic

## TODO

### Core Features
- [x] CSV import tracking and selective deletion
- [ ] Batch size overrides per tenant
- [ ] Production date history/archive
- [ ] Edit/delete orders UI
- [ ] CSV export for pick lists
- [ ] Multiple production dates view

### Reports & Analytics
- [ ] Roast schedule timeline
- [ ] Green coffee inventory tracking
- [ ] Historical production metrics
- [ ] Cost tracking per roast

### Auth & User Management
- [x] User roles (owner, staff)
- [x] Email verification
- [x] Password reset flow
- [x] Expired-session cleanup
- [x] Invite team members
- [ ] Session renewal

### Technical
- [x] Migration scripts for schema changes
- [ ] Database backup/restore
- [ ] Error monitoring
- [ ] Performance optimization for large catalogs
- [ ] Mobile responsive design improvements
- [ ] Additional test coverage (API endpoints, CSV parsing)

## License

MIT
