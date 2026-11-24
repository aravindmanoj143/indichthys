import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pathToLead, type LeadLike } from './key-path';

let id = 0;
const lead = (couplet: number, label: string, nextCouplet: number | null): LeadLike => ({
  id: ++id,
  couplet,
  label,
  text: `${couplet}${label}`,
  nextCouplet,
});
const leads = [lead(1, 'a', 2), lead(1, 'b', 3), lead(2, 'a', null), lead(2, 'b', null), lead(3, 'a', null), lead(3, 'b', 4), lead(4, 'a', null), lead(4, 'b', null)];
const find = (ref: string) => leads.find((l) => `${l.couplet}${l.label}` === ref)!.id;

test('path walks from couplet 1 to the end point', () => {
  assert.deepEqual(pathToLead(leads, find('4b')).map((s) => s.text), ['1b', '3b', '4b']);
  assert.deepEqual(pathToLead(leads, find('2a')).map((s) => s.text), ['1a', '2a']);
});

test('unreachable or unknown leads give an empty path', () => {
  const orphan = lead(9, 'a', null);
  assert.deepEqual(pathToLead([...leads, orphan], orphan.id), []);
  assert.deepEqual(pathToLead(leads, 99999), []);
});

test('cycles do not loop forever', () => {
  const cyclic = [lead(1, 'a', 2), lead(2, 'a', 3), lead(3, 'a', 2), lead(3, 'b', null)];
  assert.deepEqual(pathToLead(cyclic, cyclic[3]!.id), []);
});
