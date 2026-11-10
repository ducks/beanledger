import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
const concepts = ['studio', 'workbench', 'guided', 'ledger'];
export const load: PageServerLoad = ({ params }) => {
  if (!concepts.includes(params.concept)) error(404, 'Unknown design exploration');
  return { concept: params.concept };
};
