import { RESEARCH_TOOLS, TASKS } from './research-tools.data';

describe('research tools data', () => {
  it('has a description, a valid link and known tasks for every tool', () => {
    for (const t of RESEARCH_TOOLS) {
      expect(t.description.length).toBeGreaterThan(20);
      expect(t.internal ? t.link.startsWith('/') : t.link.startsWith('https://')).toBe(true);
      expect(t.tasks.length).toBeGreaterThan(0);
      for (const task of t.tasks) expect(Object.keys(TASKS)).toContain(task);
    }
  });

  it('has no duplicate names', () => {
    const names = RESEARCH_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
