export function clientIpFromProxy(
  remoteAddress: string | undefined,
  forwardedFor: string | string[] | undefined,
  trustedProxyHops: number,
) {
  if (trustedProxyHops > 0 && forwardedFor) {
    const chain = (Array.isArray(forwardedFor) ? forwardedFor.join(',') : forwardedFor)
      .split(',')
      .map((address) => address.trim())
      .filter(Boolean);
    const clientIndex = chain.length - trustedProxyHops;
    if (clientIndex >= 0) return chain[clientIndex];
  }
  return remoteAddress || 'unknown';
}

