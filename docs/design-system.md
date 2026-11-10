# BeanLedger design system — working proposal

Review locally at `/design-system` under `pnpm dev`. The previews are available in production builds as well as development. All examples are synthetic; controls demonstrate feedback and do
not create or change business records. The reference pages are intended for `main`.

## Product direction

A calm, approachable workspace for a small roasting team. Daily work should be
obvious without making dense operational data harder to scan. Warmth should
come from language, hierarchy, spacing, and helpful states as well as color.
Keep the current logo unchanged; final typography and wordmark are open decisions.
The system-font stack in the workshop is a placeholder, not a brand decision.

## Information architecture to validate

Make Roast days, Catalog, Packaging, Reports, and Settings stable destinations.
Keep primary navigation visible on desktop and compact but accessible on mobile.
The current catalog/settings modals would become pages; dialogs would be reserved
for short tasks and confirmations. This is a proposal, not a routing change.

The roast-day workspace should make the sequence visible: import orders, review
products and quantities, review roast batches, pack, then complete the day.
Custom CSV mapping needs a guided flow with a preview and validation before
import. Reuse the same action hierarchy throughout that flow.

## Foundations and component contract

- Use semantic surface, text, border, action, and status tokens. Both themes must
  communicate the same hierarchy; never rely on color alone for status.
- Use a 4 px spacing scale. Group related inputs closely and separate tasks with
  larger gaps. Compact table rows and comfortable forms can coexist.
- Use a restrained heading scale; tabular numerals for quantities and totals.
  Keep units visible. Right-align numeric columns and left-align names.
- Controls have a minimum 44 px height and visible keyboard focus. Every input
  needs a label; helper/error text must be programmatically associated with it.
- One primary action per task. Secondary actions use quiet surfaces. Destructive
  actions are separated and explain consequences before confirmation.
- Buttons, inputs, badges, cards, navigation, tables, dialogs, and notifications
  need shared contracts. The first reusable Button and scoped token sheet live
  in `src/lib/design-system`; remaining workshop patterns are examples pending
  review rather than prematurely abstracted components.

## States and behavior

Every data view needs loading, empty, populated, failed, and retry states.
Do not show a failed fetch as an empty account. Preserve edits after validation
or network failure. Disable duplicate submits and announce successful actions.
Dialogs must manage focus, support Escape where safe, label their purpose, and
return focus to the trigger. Prototype dialogs are not implemented yet.

## Adoption and review

1. Review the workshop in both themes and at phone/tablet/desktop widths.
2. Choose typography and brand treatment separately.
3. Validate the navigation and roast-day workflow before changing routes.
4. Extract agreed patterns into accessible components and replace one complete
   workflow at a time. Keep domain logic and API behavior unchanged.
5. Capture populated/empty/error screens, keyboard-test each workflow, measure
   contrast, and run existing workflow tests before merging.

This is an exploratory foundation, not an accessibility certification or a
finished redesign. The earlier warmer dashboard remains on this spike branch;
the workshop does not apply its scoped tokens to that dashboard yet.
