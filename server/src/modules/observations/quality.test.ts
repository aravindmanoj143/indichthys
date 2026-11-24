import assert from 'node:assert/strict';
import { test } from 'node:test';
import { communityTaxon, obscure, publicPosition, qualityGrade } from './quality';

const v = (taxonName: string, gbifKey: number | null = null, taxonRank: string | null = null) => ({ taxonName, gbifKey, taxonRank });
const full = { hasPhoto: true, observedAt: new Date('2026-01-01'), latitude: 10, longitude: 76, captive: false };

test('community taxon is the most common current identification', () => {
  const c = communityTaxon([v('Garra mullya', 1), v('Garra mullya', 1), v('Garra gotyla', 2)]);
  assert.equal(c?.taxonName, 'Garra mullya');
  assert.equal(c?.agreements, 2);
  assert.equal(c?.total, 3);
  assert.equal(c?.taxonRank, 'species');
  assert.equal(communityTaxon([]), null);
});

test('names without a GBIF key are matched case-insensitively', () => {
  assert.equal(communityTaxon([v('Pethia ticto'), v('pethia ticto')])?.agreements, 2);
});

test('quality grade', () => {
  const two = communityTaxon([v('Garra mullya', 1), v('Garra mullya', 1)]);
  assert.equal(qualityGrade(full, two), 'research');
  assert.equal(qualityGrade({ ...full, hasPhoto: false }, two), 'casual');
  assert.equal(qualityGrade({ ...full, observedAt: null }, two), 'casual');
  assert.equal(qualityGrade({ ...full, latitude: null }, two), 'casual');
  assert.equal(qualityGrade({ ...full, captive: true }, two), 'casual');
  assert.equal(qualityGrade(full, communityTaxon([v('Garra mullya', 1)])), 'needs-id');
  // 2 of 3 is not more than two thirds
  assert.equal(qualityGrade(full, communityTaxon([v('Garra mullya', 1), v('Garra mullya', 1), v('Garra gotyla', 2)])), 'needs-id');
  assert.equal(qualityGrade(full, communityTaxon([v('Garra', 5, 'genus'), v('Garra', 5, 'genus')])), 'needs-id');
});

test('obscured positions snap to the centre of a 0.2° cell', () => {
  assert.deepEqual(obscure(10.0312, 76.9876), { latitude: 10.1, longitude: 76.9 });
  assert.deepEqual(obscure(-0.05, -0.05), { latitude: -0.1, longitude: -0.1 });
  assert.deepEqual(publicPosition({ latitude: 10.0312, longitude: 76.9876, geoprivacy: 'open' }), { latitude: 10.0312, longitude: 76.9876 });
  assert.deepEqual(publicPosition({ latitude: null, longitude: 1, geoprivacy: 'open' }), { latitude: null, longitude: null });
});
