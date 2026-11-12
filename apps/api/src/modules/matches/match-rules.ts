import type { MatchSide } from '@court-flow/contracts';

export type SideAssignment<T> = { player: T; side: MatchSide };

const doublesSplits = [
  [0, 1],
  [0, 2],
  [0, 3],
] as const;

/** Split a FIFO-selected group into sides. `splitChoice` selects one of the three
 * equally likely doubles pairings and is passed in to keep the rule deterministic in tests.
 */
export function assignSides<T>(players: T[], playersPerGame: 2 | 4, splitChoice: number): SideAssignment<T>[] {
  if (players.length !== playersPerGame) throw new RangeError('Player count must match the game size');
  if (!Number.isInteger(splitChoice) || splitChoice < 0 || splitChoice > 2) {
    throw new RangeError('Split choice must be between 0 and 2');
  }

  if (playersPerGame === 2) {
    return players.map((player, index) => ({ player, side: (index + 1) as MatchSide }));
  }

  const sideOne = new Set<number>(doublesSplits[splitChoice]);
  return players.map((player, index) => ({ player, side: sideOne.has(index) ? 1 : 2 }));
}
