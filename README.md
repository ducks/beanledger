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

## Status

Initial prototype as standalone React component (`roast-planner-4.jsx`).

Next: Extract into proper web app with backend persistence.

## License

MIT
