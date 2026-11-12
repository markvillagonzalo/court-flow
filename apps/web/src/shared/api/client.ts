const visitorKey = 'courtflow:visitor-id';
const staffKey = 'courtflow:staff-token';

export function getVisitorId() {
  let id = localStorage.getItem(visitorKey);
  if (!id) {
    id = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(visitorKey, id);
  }
  return id;
}

export function getPlayerToken(code: string) {
  return localStorage.getItem(`courtflow:player:${code}`) ?? undefined;
}

export function getStaffToken() {
  return localStorage.getItem(staffKey) ?? undefined;
}

function authHeaders(token?: string, command = false) {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(command ? {
      'Idempotency-Key': typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    } : {}),
  };
}

export async function request<T>(path: string, init: RequestInit = {}, token?: string, command = false): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token, command),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload.message === 'string'
      ? payload.message
      : Array.isArray(payload.message)
        ? payload.message.join(', ')
        : 'Something went wrong. Please try again.';
    throw new Error(message);
  }
  return payload as T;
}
