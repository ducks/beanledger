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
- **Testing**: Vitest (14 tests covering core business logic)
- **Deployment**: Node.js 22, NixOS service

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
pnpm test              # Run once
pnpm test:watch        # Watch mode
pnpm test:ui           # Interactive UI
```

## Recent Updates

### 2026-03-01
- ✅ **Roast Group CRUD UI** - Create, edit, delete roast groups via Catalog modal
- ✅ **Product Edit UI** - Edit product name, weight, and roast group assignment
- ✅ **Test Suite** - Vitest with 14 passing tests covering calc.ts business logic

## TODO

### Core Features
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
- [ ] User roles (admin, team member, read-only)
- [ ] Email verification
- [ ] Password reset flow
- [ ] Session timeout/renewal
- [ ] Invite team members

### Technical
- [ ] Migration scripts for schema changes
- [ ] Database backup/restore
- [ ] Error monitoring
- [ ] Performance optimization for large catalogs
- [ ] Mobile responsive design improvements
- [ ] Additional test coverage (API endpoints, CSV parsing)

## License

MIT
