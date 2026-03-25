# BeanLedger User Guide & SOP

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Key Concepts](#key-concepts)
4. [Daily Workflow](#daily-workflow)
5. [Roast Groups Management](#roast-groups-management)
6. [Products Management](#products-management)
7. [Production Planning](#production-planning)
8. [Batch Overrides](#batch-overrides)
9. [Reports & Pick Lists](#reports--pick-lists)
10. [CSV Import](#csv-import)
11. [Manual Order Management](#manual-order-management)
12. [Troubleshooting](#troubleshooting)

---

## Overview

BeanLedger is a coffee roasting production planning application designed to help roasteries manage their daily production schedules, inventory, and batch planning.

### What BeanLedger Does
- Tracks daily production orders by roast group
- Calculates green coffee needs based on roast loss percentages
- Optimizes batch planning to minimize waste
- Manages leftover inventory from previous roasts
- Generates pick lists and production reports
- Supports both CSV imports and manual order entry

### Multi-Tenant Architecture
BeanLedger supports multiple roasteries (tenants) on the same system, with complete data isolation between tenants.

---

## Getting Started

### User Roles
- **Admin**: Full access to all features
- **User**: Standard access to production planning

### First Login
1. Navigate to the BeanLedger URL
2. Enter your username and password
3. You'll be directed to the main production planning page

---

## Key Concepts

### Roast Groups
A roast group represents a specific coffee blend or single origin that you roast. Each group contains:
- **Label**: Display name (e.g., "Espresso Blend", "Ethiopia Yirgacheffe")
- **Batch Type**: The standard batch size (e.g., "22 lb", "44 lb")
- **Roast Loss %**: Expected weight loss during roasting (typically 12-18%)
- **Type**: Either "Blend" or "Single Origin"
- **Components**: For blends, the component beans and their percentages
- **Active/Inactive**: Control visibility in the system

### Products
Products are the sellable units tied to roast groups:
- **Name**: Product name as it appears on orders
- **Weight**: Size of the product (in lbs)
- **Roast Group**: Which roast group this product uses
- **Active/Inactive**: Control visibility

### Orders
Orders represent customer demand for specific products on a production date. Orders can be:
- **CSV Imported**: Bulk imported from order management systems
- **Manual**: Individually added through the interface

### Production Days
Each production date has a status:
- **Scheduled**: Future production day with orders
- **Active**: Current working day
- **Completed**: Past production day with snapshot saved

### Leftovers
Leftover inventory from previous roasts that can be used to fulfill current demand, reducing the amount you need to roast.

---

## Daily Workflow

### Standard Daily Production Process

#### 1. Morning Setup (Active Production Day)
1. Navigate to today's date in the production calendar
2. Review all orders for the day
3. Check leftover inventory from previous days
4. Generate the Pick List (roasting schedule)

#### 2. Review Production Plan
The roast planner shows:
- **Total**: Total finished coffee needed for all orders
- **Leftover**: Available inventory (editable)
- **Needed**: Green coffee required (accounts for roast loss)
- **Batches**: Recommended number of batches to roast

#### 3. Adjust Leftovers
- Click on the leftover input for each roast group
- Enter actual leftover amount (in lbs)
- System recalculates needed green coffee

#### 4. Handle Batch Overrides
If standard batch sizes don't work:
- Click "Batch Overrides" button
- Specify custom batch type and weight
- System recalculates with override

#### 5. Print/View Pick List
- Click "Pick List" button
- Review organized list by roast group
- Each item shows product, quantity, and weight
- Manual orders marked with "M" badge

#### 6. Roast Coffee
- Follow pick list order
- Roast specified batches
- Track actual weights if needed

#### 7. End of Day
- Save production snapshot (Reports > Save Snapshot)
- Update actual leftover amounts for tomorrow
- Mark day as completed

---

## Roast Groups Management

### Creating a New Roast Group

1. Navigate to **Settings > Groups**
2. Click **New Group**
3. Fill in details:
   - **Label**: Descriptive name
   - **Batch Type**: Select standard batch size
   - **Roast Loss %**: Enter expected loss (e.g., 15 for 15%)
   - **Type**: Choose Blend or Single Origin
4. For blends, add components:
   - Click **Add Component**
   - Enter component name and percentage
   - Ensure percentages total 100%
5. Click **Save**

### Editing a Roast Group

1. Navigate to **Settings > Groups**
2. Click on the group to edit
3. Modify fields as needed
4. Click **Save**

### Deactivating vs. Deleting

**Deactivate When:**
- Seasonally rotating coffees
- Temporarily out of stock
- Want to preserve historical data

**Delete When:**
- Permanently discontinuing (only if no active/scheduled orders exist)
- The group was created in error

**Important**: You cannot delete groups with orders on active or scheduled production days. The system protects historical data by preventing deletion of groups referenced in completed production snapshots.

---

## Products Management

### Creating a New Product

1. Navigate to **Settings > Products**
2. Click **New Product**
3. Fill in details:
   - **Name**: Exact name as it appears in orders
   - **Size (lbs)**: Product weight
   - **Roast Group**: Select which group this uses
4. Click **Save**

### Product Naming Best Practices

Match your order system exactly:
- `TRADE Sure Thing 2lb` (not "Sure Thing Trade 2 lb")
- `Retail Espresso 12oz` (not "Espresso Blend Retail 12 oz")

This ensures CSV imports match correctly.

### Deactivating vs. Deleting Products

Same rules as roast groups:
- **Deactivate**: Preserve history, hide from active use
- **Delete**: Only possible if no active/scheduled orders exist

---

## Production Planning

### Accessing the Roast Planner

1. From main page, navigate to desired production date
2. View all roast groups with orders for that day
3. Each group card shows:
   - Total needed
   - Leftover inventory
   - Green coffee needed
   - Recommended batches

### Understanding the Calculations

**Basic Formula:**
```
Needed Green = (Total Finished - Leftover) / (1 - Roast Loss %)
```

**Example:**
- Total orders: 50 lbs finished coffee
- Leftover: 5 lbs
- Roast loss: 15%
- Needed green = (50 - 5) / 0.85 = 52.94 lbs green

### Batch Calculation

The system rounds to batch sizes to minimize waste:
- Uses your selected batch type (22 lb, 44 lb, etc.)
- Calculates "batches up" (always rounds up)
- Shows predicted leftover after roasting

**Example:**
- Need 52.94 lbs green
- Batch size: 22 lbs
- Batches: 3 (= 66 lbs green total)
- Predicted leftover: 11.1 lbs finished

### Working with Leftovers

**Updating Leftovers:**
1. Click in the leftover input field for a roast group
2. Enter actual leftover amount
3. Press Enter or click outside
4. System auto-saves and recalculates

**Best Practices:**
- Update leftovers at end of each production day
- Account for quality control samples
- Don't include stale coffee (>7 days old)

### Viewing Individual Products

Each roast group card can expand to show individual orders:
1. Click the toggle arrow (▶) next to product count
2. View list of all products in that group
3. See quantities and weights
4. Manual orders marked with "M" badge
5. Hover over products to reveal delete button

---

## Batch Overrides

Sometimes standard batch sizes don't fit your needs. Use batch overrides to specify custom roasting amounts.

### When to Use Batch Overrides

- Small orders that don't justify a full batch
- Large orders requiring custom batch sizes
- Testing new roast profiles with specific weights
- Equipment limitations or maintenance

### Creating a Batch Override

1. Click **Batch Overrides** button
2. For each roast group needing override:
   - Select batch type from dropdown
   - Enter custom weight (in lbs)
3. Click **Save Overrides**
4. Plan recalculates with your custom amounts

### Viewing Active Overrides

Groups with overrides show a blue "Override" badge in the roast planner.

### Removing Overrides

1. Click **Batch Overrides**
2. Delete the override entry
3. Click **Save Overrides**
4. System reverts to calculated batches

---

## Reports & Pick Lists

### Pick List

The pick list is your roasting schedule for the day.

**To Generate:**
1. Click **Pick List** button
2. View organized list by roast group
3. Each entry shows:
   - Product name
   - Quantity
   - Total weight
   - Manual badge (if applicable)
4. Delete individual orders if needed (× button on hover)

**Pick List Organization:**
- Grouped by roast group
- Sorted by product name
- Shows individual orders (not aggregated)
- Includes batch counts for each group

### Production Reports

Access comprehensive reports:
1. Click **Reports** button
2. View:
   - Detailed breakdown by group
   - Component requirements (for blends)
   - Total green coffee needs
   - Batch planning summary

### Saving Production Snapshots

**Why Save Snapshots:**
- Preserves exact state of production day
- Allows historical reporting
- Protects against data changes
- Required for day completion

**To Save Snapshot:**
1. Click **Reports** button
2. Click **Save Snapshot**
3. Snapshot captures:
   - All orders
   - Leftover amounts
   - Batch overrides
   - Production calculations

**Best Practice**: Save snapshot at end of each production day before making changes for tomorrow.

---

## CSV Import

### Preparing Your CSV File

Your CSV must include these columns:
- `product_name`: Exact product name (must match products in system)
- `quantity`: Number of units

**Optional columns:**
- `order_id`: For reference
- `customer`: For reference

**Example CSV:**
```csv
product_name,quantity
TRADE Sure Thing 2lb,6
Retail Espresso 12oz,24
Wholesale Morning Blend 5lb,8
```

### Importing Orders

1. Navigate to desired production date
2. Click **CSV Import** button (📄 icon)
3. Click **Choose File** or drag-and-drop CSV
4. Review preview:
   - Matched products shown in green
   - Unmatched products shown in red
5. Click **Import Orders**

### Handling Import Errors

**"Product not found" errors:**
- Product name doesn't match exactly
- Product is marked inactive
- Product doesn't exist in system

**Solutions:**
1. Fix product name in CSV (spelling, spacing, case)
2. Create missing product in Settings > Products
3. Activate product if inactive

### Import Batches

Each CSV import creates an import batch with a unique ID. This allows you to:
- Distinguish CSV orders from manual orders
- Track which orders came from which import
- Delete entire import batch if needed

**Import batch IDs** follow format: `import-1234567890-xxxxx`

---

## Manual Order Management

### Adding Manual Orders

Use when you have individual orders outside your CSV import system.

**To Add Manual Order:**
1. Navigate to production date
2. Click **+ Add Manual Product** button
3. In modal:
   - Enter quantity
   - Search for product (type to filter)
   - Click product to select (highlights in gold)
   - Click **Add Product**
4. Order appears immediately in roast planner

**Manual orders are marked:**
- With "M" badge in pick lists
- In roast group product lists
- Distinguishable from CSV imports

### Deleting Individual Orders

**From Roast Planner:**
1. Expand roast group product list (click ▶)
2. Hover over order to delete
3. Click × button that appears
4. Confirm deletion

**From Pick List:**
1. Open Pick List modal
2. Find order to delete
3. Hover and click × button
4. Confirm deletion
5. Pick list closes and data refreshes

### Why Manual Orders Are Separate

Manual orders have no `import_batch_id`, allowing you to:
- Identify ad-hoc orders
- Track order sources
- Manage CSV vs. manual workflows separately

### Use Cases for Manual Orders

- Phone orders
- Walk-in customers
- Sample requests
- Special events
- Corrections to CSV imports

---

## Troubleshooting

### "Cannot Delete Product/Group"

**Error**: "Cannot delete product with orders on active or scheduled production days"

**Cause**: The product/group has orders on days that aren't completed yet.

**Solution**:
1. Remove orders from active/scheduled days first, OR
2. Mark product/group as inactive instead of deleting

### Orders Not Showing in Planner

**Possible causes:**
- Wrong production date selected
- Product is inactive
- Roast group is inactive
- Orders were deleted

**Check:**
1. Verify correct date in calendar
2. Settings > Products - ensure product is active
3. Settings > Groups - ensure group is active

### CSV Import Fails

**Common issues:**
- CSV encoding problems (use UTF-8)
- Extra spaces in product names
- Mismatched product names
- Missing required columns

**Solutions:**
- Export CSV from source system as UTF-8
- Trim whitespace from product names
- Verify product names match exactly (case-sensitive)

### Batches Not Calculating Correctly

**Check:**
1. Roast loss % is set correctly in group settings
2. Leftover amount is accurate
3. Batch type matches your equipment
4. No unintended batch overrides active

### Manual Badge Not Appearing

**Issue**: Order doesn't show "M" badge

**Cause**: Order has an import_batch_id (even if empty string)

**This is normal for**: CSV imported orders

**This is abnormal for**: Orders added via "+ Add Manual Product"

**Fix**: If manual order incorrectly has import_batch_id, delete and re-add through manual workflow.

### Pick List Shows Aggregated Products

**Old behavior**: Pick list combined multiple orders of same product

**New behavior**: Pick list shows individual orders

**If seeing aggregated**: Clear browser cache and refresh

### Modal Not Appearing or Styled Incorrectly

**Solutions:**
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Check browser console for JavaScript errors

---

## Best Practices

### Daily Routine
1. Start day by reviewing roast planner
2. Update leftovers from previous day
3. Generate and print pick list
4. Roast according to plan
5. End day by saving snapshot and updating tomorrow's leftovers

### Data Hygiene
- Keep product names consistent with order system
- Deactivate seasonal coffees instead of deleting
- Save production snapshots daily
- Review and clean up old scheduled days

### Inventory Management
- Update leftovers daily
- Don't count coffee older than 7 days
- Account for QC samples in leftover amounts
- Use batch overrides for special situations

### Order Management
- Use CSV import for bulk orders
- Use manual orders for ad-hoc additions
- Regularly review and clean up duplicate orders
- Delete orders from correct production day

### Planning Ahead
- Schedule production days in advance
- Import orders as soon as available
- Review predicted leftovers to plan for tomorrow
- Use batch overrides to optimize roasting efficiency

---

## System Administration

### User Management
(Accessible to admins only)

**Adding Users:**
1. Navigate to admin panel
2. Click **Add User**
3. Enter username, email, password
4. Assign to tenant
5. Set role (admin/user)

**Removing Users:**
1. Navigate to user list
2. Click user to remove
3. Deactivate or delete

### Tenant Settings

Each tenant has isolated:
- Roast groups
- Products
- Orders
- Production days
- Users

Data never crosses tenant boundaries.

### Database Maintenance

**Production Snapshots:**
- Stored as JSON in `production_summaries` table
- One snapshot per production date per tenant
- Includes complete state at time of save

**Completed Production Days:**
- Orders preserved for historical reference
- Can be deleted safely (data in snapshot)
- Allows product/group deletion after completion

---

## Technical Details

### Data Model

**Core Tables:**
- `tenants`: Multi-tenant isolation
- `users`: User accounts
- `roast_groups`: Coffee blends/origins
- `products`: Sellable units
- `orders`: Production demands
- `leftovers`: Inventory tracking
- `batch_overrides`: Custom batch sizes
- `production_days`: Day status tracking
- `production_summaries`: Historical snapshots

### Calculation Engine

**Green Coffee Needed:**
```
needed_green = (total_finished - leftover) / (1 - (roast_loss_pct / 100))
```

**Batch Calculation:**
```
batches_up = ceil(needed_green / batch_size)
predicted_leftover = (batches_up * batch_size * (1 - roast_loss_pct / 100)) - (total_finished - leftover)
```

### API Endpoints

- `GET /api/groups` - List roast groups
- `POST /api/groups` - Create group
- `PUT /api/groups` - Update group
- `DELETE /api/groups?id={id}` - Delete group
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `PUT /api/products` - Update product
- `DELETE /api/products?id={id}` - Delete product
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `PUT /api/orders` - Update order
- `DELETE /api/orders?id={id}` - Delete single order
- `DELETE /api/orders?date={date}` - Delete all orders for date

---

## Glossary

**Batch Type**: Standard roast batch size (e.g., 22 lb, 44 lb)

**Batch Override**: Custom batch size for specific production day

**Component**: An ingredient bean in a blend with percentage

**Green Coffee**: Unroasted coffee beans (input to roasting)

**Import Batch**: Group of orders from single CSV import

**Leftover**: Finished coffee remaining from previous roast

**Manual Order**: Order added individually through UI

**Pick List**: Production schedule showing what to roast

**Production Day**: Calendar date with status (scheduled/active/completed)

**Roast Group**: Coffee blend or single origin configuration

**Roast Loss**: Weight loss during roasting (typically 12-18%)

**Snapshot**: Saved state of production day for historical record

**Tenant**: Isolated roastery account in multi-tenant system

---

## Support & Updates

For technical issues or feature requests, contact your system administrator.

**Version**: 1.0
**Last Updated**: March 2026

---

## Quick Reference Card

### Keyboard Shortcuts
- None currently implemented

### Common Tasks

| Task | Steps |
|------|-------|
| Add manual order | + Add Manual Product → Enter qty → Search → Select → Add |
| Delete order | Expand group → Hover → Click × |
| Update leftover | Click leftover field → Enter amount → Press Enter |
| Generate pick list | Click Pick List button |
| Save snapshot | Reports → Save Snapshot |
| Import CSV | 📄 icon → Choose file → Import |
| Create override | Batch Overrides → Select type → Enter weight → Save |

### Status Indicators

| Indicator | Meaning |
|-----------|---------|
| M badge | Manual order |
| Override badge | Custom batch size active |
| Green highlight | CSV matched product |
| Red highlight | CSV unmatched product |
| × button (hover) | Delete order |
| ▶ arrow | Expand products |
| ▼ arrow | Collapse products |

---

*End of BeanLedger User Guide*
