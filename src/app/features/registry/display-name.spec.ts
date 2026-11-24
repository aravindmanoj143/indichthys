import { displayName, initials } from './display-name';

describe('displayName', () => {
  it('adds the title once', () => {
    expect(displayName({ honorific: 'Dr', fullName: 'Anjali Rao' })).toBe('Dr Anjali Rao');
    expect(displayName({ honorific: 'Dr', fullName: 'Dr. Anjali Rao' })).toBe('Dr. Anjali Rao');
    expect(displayName({ honorific: 'Prof.', fullName: 'prof Anjali Rao' })).toBe('prof Anjali Rao');
    expect(displayName({ honorific: null, fullName: 'Anjali Rao' })).toBe('Anjali Rao');
  });
  it('builds initials without the title', () => {
    expect(initials('Dr. Anjali Rao')).toBe('AR');
    expect(initials('Helen K. Larson')).toBe('HL');
    expect(initials('J.D. Marcus Knight')).toBe('JK');
    expect(initials('Madonna')).toBe('M');
  });
});
