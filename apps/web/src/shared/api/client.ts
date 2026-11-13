const visitorKey = 'courtflow:visitor-id';
const staffKey = 'courtflow:staff-token';

function secureUuid() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getVisitorId() {
  let id = localStorage.getItem(visitorKey);
  if (!id) {
    id = secureUuid();
    localStorage.setItem(visitorKey, id);
  }
  return id;
}

export function getPlayerToken(code: string) {
  const key = `courtflow:player:${code}`;
  localStorage.removeItem(key);
  return sessionStorage.getItem(key) ?? undefined;
}

export function getStaffToken() {
  localStorage.removeItem(staffKey);
  return sessionStorage.getItem(staffKey) ?? undefined;
}

function authHeaders(token?: string, command = false) {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(command ? {
      'Idempotency-Key': secureUuid(),
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
