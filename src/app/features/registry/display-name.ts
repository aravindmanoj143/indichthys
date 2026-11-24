/** "Dr" + "Anjali Rao" → "Dr Anjali Rao", without doubling a title already in the name. */
export function displayName(p: { honorific: string | null; fullName: string }): string {
  const h = p.honorific?.trim().replace(/\.$/, '');
  if (!h) return p.fullName;
  return new RegExp(`^${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.?\\s`, 'i').test(p.fullName) ? p.fullName : `${h} ${p.fullName}`;
}

/** Initials from the first and last name, ignoring a leading title: "Helen K. Larson" → "HL". */
export function initials(name: string): string {
  const words = name
    .replace(/^(dr|prof|mr|ms|mrs)\.?\s+/i, '')
    .split(/\s+/)
    .filter((w) => w);
  const picked = words.length > 1 ? [words[0]!, words.at(-1)!] : words;
  return picked.map((w) => w[0]?.toUpperCase() ?? '').join('');
}
