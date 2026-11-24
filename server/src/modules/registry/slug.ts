/** URL slug from a person's name: "Dr. Anjali Rao" → "anjali-rao". */
export function slugify(name: string): string {
  return (
    name
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/^(dr|prof|mr|ms|mrs)\.?\s+/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'ichthyologist'
  );
}

/** First free slug: base, base-2, base-3 … */
export async function uniqueSlug(base: string, taken: (slug: string) => Promise<boolean>): Promise<string> {
  let slug = base;
  for (let i = 2; await taken(slug); i++) slug = `${base}-${i}`;
  return slug;
}
