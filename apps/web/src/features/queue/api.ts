import type { JoinQueueRequest, JoinQueueResponse, PlayerWithdrawResponse, PublicSnapshot } from '@court-flow/contracts';
import { getVisitorId, request } from '../../shared/api/client';

export const queueApi = {
  publicSnapshot(code: string, token?: string) {
    return request<PublicSnapshot>(`/api/public/sessions/${encodeURIComponent(code)}`, {}, token);
  },
  async join(code: string, displayName: string) {
    const input: JoinQueueRequest = { visitorId: getVisitorId(), displayName };
    const result = await request<JoinQueueResponse>(`/api/public/sessions/${encodeURIComponent(code)}/join`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    sessionStorage.setItem(`courtflow:player:${code}`, result.token);
    return result;
  },
  withdraw(token: string) {
    return request<PlayerWithdrawResponse>('/api/player/me', { method: 'DELETE' }, token, true);
  },
};
