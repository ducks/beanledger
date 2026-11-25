/** Deliberately small removal language. Never evaluates user-supplied regex. */
export class NameRuleError extends Error {}

export function validateNameRules(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20) {
    throw new NameRuleError('Use at most 20 name cleanup rules.');
  }
  return value.map((pattern, index) => {
    const prefix = `Rule ${index + 1}: `;
    if (typeof pattern !== 'string' || !pattern.trim() || pattern.length > 300) {
      throw new NameRuleError(prefix + 'enter 1 to 300 characters.');
    }
    const pieces = pattern.split('{number}');
    if (pieces.length > 2) throw new NameRuleError(prefix + 'use at most one {number} placeholder.');
    const literal = pieces.join('');
    if (/[{}]/.test(literal)) throw new NameRuleError(prefix + 'only {number} is supported; other braces are not allowed.');
    if (!literal.trim()) throw new NameRuleError(prefix + 'include literal text alongside {number}.');
    return pattern;
  });
}

export function parseNameRulesText(text: string): string[] {
  const patterns = text.split(/\r?\n/).filter(line => line.trim()).map((line, index) => {
    try {
      const value = JSON.parse(line.trim());
      if (typeof value !== 'string') throw new Error();
      return value;
    } catch {
      throw new NameRuleError(`Rule ${index + 1}: wrap the pattern in double quotes. Escape embedded quotes with a backslash.`);
    }
  });
  return validateNameRules(patterns);
}

export function compileNameRules(value: unknown): (name: string) => string {
  const patterns = validateNameRules(value);
  const escape = (literal: string) => literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rules = patterns.map(pattern => new RegExp(
    pattern.split('{number}').map(escape).join('(?<![0-9.])[0-9]+(?![0-9.])'), 'g'
  ));
  return (name: string) => {
    let cleaned = name;
    for (const rule of rules) cleaned = cleaned.replace(rule, '');
    // Do not normalize legacy names, or names that no rule touched.
    return cleaned === name ? name : cleaned.replace(/\s+/g, ' ').trim();
  };
}
