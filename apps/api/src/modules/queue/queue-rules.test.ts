import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReason, orderWaiting, takeNext } from './queue-rules';

test('FIFO order is stable and does not mutate the source list', () => {
  const entries = [
    { id: 'b', queueOrder: 2 },
    { id: 'a', queueOrder: 1 },
    { id: 'c', queueOrder: 2 },
  ];
  assert.deepEqual(orderWaiting(entries).map(({ id }) => id), ['a', 'b', 'c']);
  assert.deepEqual(entries.map(({ id }) => id), ['b', 'a', 'c']);
});

test('the next group comes from the head of the FIFO queue', () => {
  assert.deepEqual(
    takeNext(
      [
        { id: '3', queueOrder: 3 },
        { id: '1', queueOrder: 1 },
        { id: '2', queueOrder: 2 },
      ],
      2,
    ).map(({ id }) => id),
    ['1', '2'],
  );
});

test('staff reasons are normalized and required', () => {
  assert.equal(normalizeReason('   player   not   present  '), 'player not present');
  assert.throws(() => normalizeReason('  '), /at least 3/);
  assert.throws(() => normalizeReason('x'.repeat(241)), /240 characters/);
});
