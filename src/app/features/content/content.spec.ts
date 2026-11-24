import { sectionForUrl } from '../../core/navigation';
import { daysUntil, opportunityTypeLabel, paragraphs } from './content.api';
import { dateRange } from './pages/events';

const iso = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
};

describe('content helpers', () => {
  it('counts days until a deadline', () => {
    expect(daysUntil(iso(0))).toBe(0);
    expect(daysUntil(iso(5))).toBe(5);
    expect(daysUntil(iso(-1))).toBe(-1);
    expect(daysUntil(null)).toBeNull();
  });

  it('splits plain text into paragraphs', () => {
    expect(paragraphs('One.\n\nTwo\nlines.\n\n\n')).toEqual(['One.', 'Two\nlines.']);
  });

  it('formats event date ranges compactly', () => {
    expect(dateRange('2027-02-10T00:00:00', '2027-02-11T00:00:00')).toMatch(/^10 – 11 Feb 2027$/);
    expect(dateRange('2027-02-10T00:00:00', null)).toMatch(/10 Feb 2027/);
  });

  it('labels opportunity types per section', () => {
    expect(opportunityTypeLabel('jobs', 'phd')).toBe('PhD position');
    expect(opportunityTypeLabel('funding', 'csr-funding')).toBe('CSR funding');
  });
});

describe('sectionForUrl', () => {
  it('maps module and detail URLs to their nav section', () => {
    expect(sectionForUrl('/jobs?type=phd')?.label).toBe('Opportunities');
    expect(sectionForUrl('/opportunities/some-grant')?.label).toBe('Opportunities');
    expect(sectionForUrl('/threatened')?.label).toBe('Conservation');
    expect(sectionForUrl('/organisations/3')?.label).toBe('People');
    expect(sectionForUrl('/specimens/123')?.label).toBe('Research');
    expect(sectionForUrl('/tools?task=meristics')?.label).toBe('Research');
    expect(sectionForUrl('/publications/12')?.label).toBe('Research');
    expect(sectionForUrl('/events')?.label).toBe('Discover');
    expect(sectionForUrl('/learning/fish-taxonomy-and-nomenclature/lessons/2')?.label).toBe('Learning');
    expect(sectionForUrl('/workshops')?.label).toBe('Learning');
  });
});
