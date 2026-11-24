import assert from 'node:assert/strict';
import { test } from 'node:test';
import { certificateCode, scoreQuiz } from './routes';

test('scoreQuiz counts only correct choices', () => {
  const questions = [
    { id: 1, options: [{ id: 10, isCorrect: true }, { id: 11, isCorrect: false }] },
    { id: 2, options: [{ id: 20, isCorrect: false }, { id: 21, isCorrect: true }] },
    { id: 3, options: [{ id: 30, isCorrect: true }] },
  ];
  const r = scoreQuiz(questions, { '1': 10, '2': 20, '99': 30 });
  assert.equal(r.score, 1 / 3);
  assert.deepEqual([...r.correct], [1]);
  assert.equal(scoreQuiz([], {}).score, 0);
});

test('certificate codes are readable and unique-ish', () => {
  const codes = new Set(Array.from({ length: 200 }, certificateCode));
  assert.equal(codes.size, 200);
  for (const c of codes) assert.match(c, /^IX-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
});
