const DEFAULT_DEVELOPMENT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];
export const DEFAULT_DEVELOPMENT_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/courtflow';

export type RuntimeSecurityConfig = {
  staffPin: string;
  sessionSecret: string;
  webOrigins: Set<string>;
  apiHost: string;
  apiPort: number;
  trustedProxyHops: number;
};

function parseOrigins(raw: string | undefined, isProduction: boolean): Set<string> {
  const configured = raw?.split(',').map((origin) => origin.trim()).filter(Boolean);
  const values = configured?.length ? configured : isProduction ? [] : DEFAULT_DEVELOPMENT_ORIGINS;
  const origins = new Set<string>();

  for (const value of values) {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(`WEB_ORIGINS contains an invalid origin: ${value}`);
    }
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== '/' ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error(`WEB_ORIGINS must contain only http(s) origins: ${value}`);
    }
    if (isProduction && parsed.protocol !== 'https:') {
      throw new Error('WEB_ORIGINS must use HTTPS when NODE_ENV is production');
    }
    origins.add(parsed.origin);
  }

  if (isProduction && origins.size === 0) {
    throw new Error('WEB_ORIGINS must list the HTTPS origin(s) serving the web app in production');
  }
  return origins;
}

export function readWebOrigins(env: NodeJS.ProcessEnv = process.env) {
  return parseOrigins(env.WEB_ORIGINS, env.NODE_ENV === 'production');
}

export function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  const databaseUrl = env.DATABASE_URL?.trim();
  if (databaseUrl) return databaseUrl;
  if (env.NODE_ENV !== 'production') return DEFAULT_DEVELOPMENT_DATABASE_URL;
  throw new Error('DATABASE_URL must be configured in production');
}

export function readTrustedProxyHops(env: NodeJS.ProcessEnv = process.env) {
  const defaultHops = env.NODE_ENV === 'production' ? 0 : 1;
  const hops = Number(env.TRUST_PROXY_HOPS ?? defaultHops);
  if (!Number.isInteger(hops) || hops < 0 || hops > 5) {
    throw new Error('TRUST_PROXY_HOPS must be an integer between 0 and 5');
  }
  return hops;
}

export function readRuntimeSecurityConfig(
  env: NodeJS.ProcessEnv = process.env,
): RuntimeSecurityConfig {
  const isProduction = env.NODE_ENV === 'production';
  const sessionSecret = env.SESSION_SECRET?.trim() ?? '';
  const staffPin = env.STAFF_PIN?.trim() ?? '';
  const placeholder = /replace-this|change-this|example|your-secret|development-secret/i;

  if (sessionSecret.length < 32 || placeholder.test(sessionSecret)) {
    throw new Error('SESSION_SECRET must be a private, non-placeholder value with at least 32 characters');
  }
  if (
    !/^\d{8,12}$/.test(staffPin) ||
    placeholder.test(staffPin) ||
    /^(\d)\1+$/.test(staffPin) ||
    ['12345678', '87654321', '12341234', '11223344', '12121212'].includes(staffPin)
  ) {
    throw new Error('STAFF_PIN must be a private 8 to 12 digit PIN and must not be a common or repeated sequence');
  }

  const databaseUrl = resolveDatabaseUrl(env);
  let parsedDatabaseUrl: URL;
  try {
    parsedDatabaseUrl = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL');
  }
  if (!['postgres:', 'postgresql:'].includes(parsedDatabaseUrl.protocol)) {
    throw new Error('DATABASE_URL must use the postgres or postgresql protocol');
  }
  if (isProduction && parsedDatabaseUrl.password === 'postgres') {
    throw new Error('DATABASE_URL must not use the default postgres password in production');
  }

  const apiPort = Number(env.API_PORT ?? 3001);
  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
    throw new Error('API_PORT must be an integer between 1 and 65535');
  }

  return {
    staffPin,
    sessionSecret,
    webOrigins: readWebOrigins(env),
    apiHost: env.API_HOST?.trim() || '127.0.0.1',
    apiPort,
    trustedProxyHops: readTrustedProxyHops(env),
  };
}

