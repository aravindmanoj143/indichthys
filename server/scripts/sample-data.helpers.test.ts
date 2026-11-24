import assert from 'node:assert/strict';
import { test } from 'node:test';
import { binomials, cleanTitle, fixCaps, topicsFor } from './sample-data.helpers';

test('cleanTitle removes markup without gluing words', () => {
  assert.equal(cleanTitle('A New Species of<i>Pethia</i>from the Western Ghats, India (<i>Teleostei</i>: Cyprinidae)'), 'A New Species of Pethia from the Western Ghats, India (Teleostei: Cyprinidae)');
  assert.equal(cleanTitle('&lt;i&gt;Garra dohjei&lt;/i&gt;, a new species'), 'Garra dohjei, a new species');
});

test('binomials finds species names, not ordinary words', () => {
  assert.deepEqual(binomials('Garra dohjei, a new species of labeonine fish from Meghalaya, India'), ['Garra dohjei']);
  assert.deepEqual(binomials('A new species of Glyptothorax from the Brahmaputra River basin'), []);
});

test('topicsFor maps regions and groups', () => {
  const t = topicsFor('Schistura syngkai, a new fish species (Teleostei: Nemacheilidae) from Meghalaya, northeast India');
  for (const slug of ['taxonomy', 'northeast-india', 'hillstream-loaches', 'cypriniformes']) assert.ok(t.includes(slug), slug);
});

test('fixCaps', () => {
  assert.equal(fixCaps('RANDALL'), 'Randall');
  assert.equal(fixCaps('Kosygin'), 'Kosygin');
});

test('topicsFor matches whole words only', () => {
  const t = topicsFor('Exostoma nasibarbatum, a new species of glyptosternine catfish from Manipur, northeastern India');
  assert.ok(t.includes('siluriformes'));
  assert.ok(!t.includes('cypriniformes'), 'nasibarbatum is not a barb');
});
