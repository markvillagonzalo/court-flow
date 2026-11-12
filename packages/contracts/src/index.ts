export type SessionState = 'open' | 'closed';
export type CourtState = 'available' | 'playing';
export type PlayerTicketStatus = 'waiting' | 'playing' | 'left' | 'skipped';

export type Court = { id: string; label: string; state: CourtState };
export type PublicQueueEntry = { displayName: string; position: number; joinedAt: string };
export type StaffQueueEntry = PublicQueueEntry & { id: string; queueOrder: number };
export type MatchSide = 1 | 2;
export type PublicMatchPlayer = { displayName: string; side: MatchSide };
export type PublicMatchView = {
  id: string;
  courtLabel: string;
  startedAt: string;
  players: PublicMatchPlayer[];
};
export type StaffMatchPlayer = { id: string; displayName: string; leaveAfterMatch: boolean; side: MatchSide };
export type StaffMatchView = {
  id: string;
  courtId: string;
  courtLabel: string;
  startedAt: string;
  players: StaffMatchPlayer[];
};
export type MatchSideView = { side: MatchSide; players: string[] };
export type CompletedMatchView = {
  id: string;
  courtLabel: string;
  startedAt: string;
  finishedAt: string;
  winningSide: MatchSide;
  sides: MatchSideView[];
};
export type PlayerStanding = { displayName: string; played: number; wins: number; losses: number };
export type MatchView = PublicMatchView | StaffMatchView;
export type ActivityItem = { eventType: string; target: string; reason?: string | null; createdAt: string };
export type SessionView = {
  id: string;
  name: string;
  publicCode: string;
  sport: string;
  playersPerGame: number;
  state: SessionState;
  version: number;
};
export type PlayerTicketView = {
  displayName: string;
  status: PlayerTicketStatus;
  position: number | null;
  leaveAfterMatch: boolean;
};
export type QueueSnapshot = {
  session: SessionView;
  courts: Court[];
  queue: (PublicQueueEntry | StaffQueueEntry)[];
  waitingCount: number;
  activeMatches: MatchView[];
  standings: PlayerStanding[];
  recentResults: CompletedMatchView[];
  myTicket: PlayerTicketView | null;
  recentActivity: ActivityItem[];
};
export type PublicSnapshot = Omit<QueueSnapshot, 'queue' | 'activeMatches'> & {
  queue: PublicQueueEntry[];
  activeMatches: PublicMatchView[];
};
export type StaffSnapshot = Omit<QueueSnapshot, 'queue' | 'activeMatches' | 'myTicket'> & {
  queue: StaffQueueEntry[];
  activeMatches: StaffMatchView[];
  myTicket: null;
};
export type StaffSessionListItem = {
  id: string;
  name: string;
  publicCode: string;
  sport: string;
  playersPerGame: number;
  state: SessionState;
  version: number;
  courtCount: number;
  waitingCount: number;
  createdAt: string;
};

export type StaffLoginRequest = { pin: string };
export type StaffLoginResponse = { token: string };
export type JoinQueueRequest = { visitorId: string; displayName: string };
export type JoinQueueResponse = {
  token: string;
  sessionId: string;
  ticket: { displayName: string; status: PlayerTicketStatus };
};
export type PlayerWithdrawResponse = { ok: true; status: 'left' | 'leave_after_match' };
export type CreateSessionRequest = {
  name: string;
  sport: string;
  courtCount: number;
  playersPerGame: 2 | 4;
};
export type CreateSessionResponse = { id: string; publicCode: string };
export type CreateCourtRequest = { label: string };
export type CompleteMatchRequest = { returningPlayerIds: string[]; winnerSide: MatchSide };
export type ReasonRequest = { reason: string };
export type ReorderRequest = ReasonRequest & { target: 'front' | 'back' };
export type SessionChangedEvent = { version: number };
export type JoinSessionEvent = { code: string };
