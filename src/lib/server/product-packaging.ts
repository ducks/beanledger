import { query } from '$lib/db';
import { ValidationError } from './validate';

export async function packagingChoice(body: Record<string, unknown>, tenantId: string) {
  // Omitted fields support older API clients; updates preserve their assignment.
  if (body.packaging_mode === undefined && body.packaging_type_id === undefined) return null;
  const mode = body.packaging_mode;
  const id = body.packaging_type_id ?? null;
  if (!['legacy', 'tracked', 'untracked'].includes(mode as string)) {
    throw new ValidationError('Choose packaging or Untracked / bulk');
  }
  if (mode !== 'tracked') {
    if (id !== null) throw new ValidationError('Only tracked products can select packaging');
    return { mode, id: null };
  }
  const invalid = () => new ValidationError('Choose an available packaging type');
  if (typeof id !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) throw invalid();
  const found = await query('SELECT 1 FROM packaging_types WHERE id = $1 AND tenant_id = $2 AND active', [id, tenantId]);
  if (!found.rows.length) throw invalid();
  return { mode, id };
}
