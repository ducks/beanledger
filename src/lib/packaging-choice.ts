/** Empty choices are rejected by forms; legacy is reserved for existing records. */
export function packagingFields(choice: string) {
  return choice === 'legacy' || choice === 'untracked'
    ? { packaging_mode: choice, packaging_type_id: null }
    : { packaging_mode: 'tracked', packaging_type_id: choice };
}
