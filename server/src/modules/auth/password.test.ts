import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashPassword, verifyPassword } from './password';

test('hash verifies the right password only', async () => {
  const h = await hashPassword('correct horse battery staple');
  assert.match(h, /^scrypt\$/);
  assert.equal(await verifyPassword('correct horse battery staple', h), true);
  assert.equal(await verifyPassword('wrong password', h), false);
});

test('hashes are salted', async () => {
  assert.notEqual(await hashPassword('same'), await hashPassword('same'));
});

test('malformed stored hashes never verify', async () => {
  assert.equal(await verifyPassword('x', 'not-a-hash'), false);
});
