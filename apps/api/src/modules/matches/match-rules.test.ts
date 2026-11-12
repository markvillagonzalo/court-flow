import assert from 'node:assert/strict';
import { assignSides } from './match-rules';

const singles = assignSides(['Alice', 'Bob'], 2, 0);
assert.deepEqual(singles, [
  { player: 'Alice', side: 1 },
  { player: 'Bob', side: 2 },
]);

const doubles = [0, 1, 2].map((choice) => assignSides(['A', 'B', 'C', 'D'], 4, choice));
assert.deepEqual(
  doubles.map((assignment) => assignment.filter((entry) => entry.side === 1).map((entry) => entry.player).join('')),
  ['AB', 'AC', 'AD'],
  'the three possible doubles pairings are available',
);
for (const assignment of doubles) {
  assert.equal(assignment.filter((entry) => entry.side === 1).length, 2);
  assert.equal(assignment.filter((entry) => entry.side === 2).length, 2);
  assert.deepEqual(assignment.map((entry) => entry.player).sort(), ['A', 'B', 'C', 'D']);
}

assert.throws(() => assignSides(['Alice'], 2, 0), RangeError);
assert.throws(() => assignSides(['A', 'B', 'C', 'D'], 4, 3), RangeError);
console.log('Match side assignment tests passed.');
