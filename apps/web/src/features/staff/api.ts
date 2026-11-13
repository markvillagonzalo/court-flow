import type {
  CompleteMatchRequest,
  CreateCourtRequest,
  CreateSessionRequest,
  CreateSessionResponse,
  ReasonRequest,
  ReorderRequest,
  StaffLoginRequest,
  StaffLoginResponse,
  StaffSessionListItem,
  StaffSnapshot,
} from '@court-flow/contracts';
import { request } from '../../shared/api/client';

export const staffApi = {
  login(pin: string) {
    const input: StaffLoginRequest = { pin };
    return request<StaffLoginResponse>('/api/auth/staff', { method: 'POST', body: JSON.stringify(input) });
  },
  listSessions(token: string) {
    return request<StaffSessionListItem[]>('/api/staff/sessions', {}, token);
  },
  createSession(token: string, input: CreateSessionRequest) {
    return request<CreateSessionResponse>('/api/staff/sessions', {
      method: 'POST',
      body: JSON.stringify(input),
    }, token, true);
  },
  snapshot(token: string, id: string) {
    return request<StaffSnapshot>(`/api/staff/sessions/${id}`, {}, token);
  },
  deleteSession(token: string, sessionId: string) {
    return request<void>(`/api/staff/sessions/${sessionId}`, { method: 'DELETE' }, token);
  },
  addCourt(token: string, sessionId: string, input: CreateCourtRequest) {
    return request<StaffSnapshot>(`/api/staff/sessions/${sessionId}/courts`, {
      method: 'POST',
      body: JSON.stringify(input),
    }, token, true);
  },
  removeCourt(token: string, courtId: string) {
    return request<StaffSnapshot>(`/api/staff/courts/${courtId}`, { method: 'DELETE' }, token, true);
  },
  callNext(token: string, sessionId: string, courtId: string) {
    return request<StaffSnapshot>(`/api/staff/sessions/${sessionId}/courts/${courtId}/call-next`, {
      method: 'POST',
    }, token, true);
  },
  completeMatch(token: string, matchId: string, input: CompleteMatchRequest) {
    return request<StaffSnapshot>(`/api/staff/matches/${matchId}/complete`, {
      method: 'POST',
      body: JSON.stringify(input),
    }, token, true);
  },
  skipTicket(token: string, sessionId: string, ticketId: string, input: ReasonRequest) {
    return request<StaffSnapshot>(`/api/staff/sessions/${sessionId}/tickets/${ticketId}/skip`, {
      method: 'POST',
      body: JSON.stringify(input),
    }, token, true);
  },
  reorderTicket(token: string, sessionId: string, ticketId: string, input: ReorderRequest) {
    return request<StaffSnapshot>(`/api/staff/sessions/${sessionId}/tickets/${ticketId}/reorder`, {
      method: 'POST',
      body: JSON.stringify(input),
    }, token, true);
  },
};
