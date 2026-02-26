# BeanLedger Setup

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- pnpm (or npm)

## Database Setup

```bash
createdb beanledger
psql beanledger < schema.sql
psql beanledger < seed.sql
```

## Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your database connection:

```
DATABASE_URL=postgresql://user:password@localhost:5432/beanledger
```

## Install Dependencies

```bash
pnpm install
```

## Run Development Server

```bash
pnpm dev
```

Navigate to http://localhost:5173

## Build for Production

```bash
pnpm build
pnpm preview
```

## Next Steps

1. Create database and run schema
2. Configure DATABASE_URL
3. Install dependencies
4. Run dev server
5. Import initial data (groups and products) via catalog manager

## Migration from Prototype

The original `roast-planner-4.jsx` used localStorage. To migrate:

1. Export data from localStorage (browser console)
2. Insert into PostgreSQL tables using provided schema
3. Format: groups → roast_groups, products → products

No automated migration tool yet - manual SQL INSERT statements for now.
