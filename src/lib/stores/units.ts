import { writable, type Writable } from 'svelte/store';
import type { Units } from '$lib/types';

/**
 * The user's preferred display units for weights.
 *
 * Source of truth lives on the User record (preferred_units column) and is
 * loaded into the layout via locals.user. This store is hydrated from that
 * server-loaded value on app start, then components subscribe to it.
 *
 * Components should never hold their own `units` state — read from this
 * store. Updating the store also persists to the server via setUnits().
 */
export const units: Writable<Units> = writable<Units>('lbs');

/**
 * Update the preferred units, persisting to the server. The store updates
 * optimistically; on server failure we revert and surface the error to the
 * caller.
 */
export async function setUnits(next: Units): Promise<void> {
  let previous: Units = 'lbs';
  units.update((current) => {
    previous = current;
    return next;
  });

  try {
    const res = await fetch('/api/user/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferred_units: next })
    });
    if (!res.ok) {
      units.set(previous);
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to save unit preference');
    }
  } catch (err) {
    units.set(previous);
    throw err;
  }
}
