import { FEATURED_FISH, featuredFor, isoWeek } from './home.data';

describe('home featured fish', () => {
  it('computes ISO weeks, including year boundaries', () => {
    expect(isoWeek(new Date(2026, 10, 25))).toEqual({ year: 2026, week: 48 });
    expect(isoWeek(new Date(2027, 0, 1))).toEqual({ year: 2026, week: 53 });
    expect(isoWeek(new Date(2024, 11, 30))).toEqual({ year: 2025, week: 1 });
  });

  it('never features the same fish as both week and month, all year', () => {
    for (let d = new Date(2026, 0, 1); d.getFullYear() === 2026; d.setDate(d.getDate() + 1)) {
      const { week, month } = featuredFor(d);
      expect(week.key).not.toBe(month.key);
    }
  });

  it('keeps the same fish all week and changes it the next week', () => {
    for (let d = new Date(2026, 0, 5); d.getFullYear() === 2026; d.setDate(d.getDate() + 7)) {
      const next = new Date(d); next.setDate(d.getDate() + 7);
      if (next.getMonth() === d.getMonth()) expect(featuredFor(next).week).not.toBe(featuredFor(d).week);
    }
    const mon = featuredFor(new Date(2026, 10, 23)).week;
    expect(featuredFor(new Date(2026, 10, 29)).week).toBe(mon);
    expect(featuredFor(new Date(2026, 10, 30)).week).not.toBe(mon);
  });

  it('has unique species', () => {
    expect(new Set(FEATURED_FISH.map((f) => f.key)).size).toBe(FEATURED_FISH.length);
  });
});
