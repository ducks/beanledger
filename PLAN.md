# BeanLedger Development Plan

## Current State

Working React prototype (`roast-planner-4.jsx`) with localStorage persistence.
Schema extracted to `schema.sql`.

## Architecture

```
beanledger/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── groups/        # CRUD for roast groups
│   │   ├── products/      # CRUD for products
│   │   ├── orders/        # CRUD for orders
│   │   ├── leftovers/     # CRUD for leftovers
│   │   └── summaries/     # Production summaries
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main planner page
├── components/
│   └── RoastPlanner.tsx   # Refactored planner component
├── lib/
│   ├── db.ts              # Database connection
│   └── types.ts           # TypeScript types
├── schema.sql             # Database schema
└── package.json
```

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Direct SQL with pg (or Prisma if preferred)
- **Language**: TypeScript

## Data Model

### Core Tables

1. **roast_groups**: Coffee families (Sure Thing, Nano Genji, etc.)
2. **products**: SKUs with bag sizes
3. **orders**: Product + quantity per production date
4. **leftovers**: Roasted coffee remaining per group

### Supporting Tables

5. **batch_overrides**: Custom batch weights
6. **production_summaries**: Saved snapshots

## Next Steps

1. Set up Next.js project with TypeScript
2. Configure PostgreSQL connection
3. Create database and run schema
4. Build API routes (CRUD for each table)
5. Refactor roast-planner component to use API
6. Add authentication (optional, single-tenant initially)
7. Deploy

## Database Setup

```bash
createdb beanledger
psql beanledger < schema.sql
```

## Environment Variables

```
DATABASE_URL=postgresql://user:pass@localhost:5432/beanledger
```

## Notes

- Start simple: single tenant, no auth initially
- Keep calculation logic in frontend (calcGroup function)
- Backend is just persistence layer
- Can add multi-tenant + auth later if needed
