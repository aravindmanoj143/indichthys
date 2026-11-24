import assert from 'node:assert/strict';
import { test } from 'node:test';
import { titleSlug } from './routes';

test('titleSlug makes readable URL slugs', () => {
  assert.equal(titleSlug('New species of Garra from Kerala!'), 'new-species-of-garra-from-kerala');
  assert.equal(titleSlug('  Ichthyology Conference 2027 — Kochi  '), 'ichthyology-conference-2027-kochi');
  assert.equal(titleSlug('Pérez & Müller'), 'perez-muller');
  assert.equal(titleSlug('!!!'), 'item');
  assert.ok(titleSlug('x'.repeat(200)).length <= 70);
});
