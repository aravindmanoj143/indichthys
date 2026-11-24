import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deriveRequestStatus, tallyProposal } from './verification';

const p = (isExpert: boolean, reviews: [string, boolean][], taxonId = 7) => ({
  id: 1,
  taxonId,
  isExpert,
  reviews: reviews.map(([decision, isExpert]) => ({ decision, isExpert })),
});

test('a lone proposal is not verified', () => {
  assert.equal(tallyProposal(p(true, [])).verified, false);
});

test('two agreements including an expert verify', () => {
  assert.equal(tallyProposal(p(false, [['agree', true]])).verified, true);
  assert.equal(tallyProposal(p(true, [['agree', false]])).verified, true);
});

test('agreement without any expert does not verify', () => {
  assert.equal(tallyProposal(p(false, [['agree', false], ['agree', false]])).verified, false);
});

test('expert disagreement blocks verification', () => {
  assert.equal(tallyProposal(p(true, [['agree', false], ['disagree', true]])).verified, false);
});

test('request status follows its proposals; closed stays closed', () => {
  assert.deepEqual(deriveRequestStatus('open', []), { status: 'open', verifiedTaxonId: null });
  assert.equal(deriveRequestStatus('open', [p(false, [])]).status, 'proposed');
  assert.deepEqual(deriveRequestStatus('proposed', [p(false, [['agree', true]], 42)]), { status: 'verified', verifiedTaxonId: 42 });
  assert.equal(deriveRequestStatus('closed', [p(false, [['agree', true]])]).status, 'closed');
});
