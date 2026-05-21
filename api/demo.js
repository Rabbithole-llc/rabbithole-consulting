// Edge proxy for service-demo paths (/<vertical>-demo/*).
//
// A plain vercel.json rewrite to a Railway upstream is transparent — Vercel does
// NOT edge-cache rewrites to external URLs, so every prospect click round-trips
// to Railway and pays ~700ms TTFB + body transfer. This function takes over the
// proxy, fetches Railway once per region, and returns the response with cache
// headers Vercel's edge respects. Subsequent clicks hit the edge cache.
//
// Wired via vercel.json rewrites:
//   /<v>-demo            -> /api/demo?u=<railway-url>
//   /<v>-demo/:path*     -> /api/demo?u=<railway-url>&path=:path*
//
// New verticals don't require code changes here — the rewrite supplies the
// upstream URL. Only constraint: it must be a *.up.railway.app host.

export const config = {
  runtime: 'edge',
};

// 5-minute browser cache, 24-hour edge cache, 7-day stale-while-revalidate.
const CACHE_HEADER = 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800';

const STRIP_REQUEST_HEADERS = new Set([
  'host', 'connection',
  'x-vercel-id', 'x-vercel-forwarded-for', 'x-vercel-deployment-url',
  'x-vercel-ip-as-number', 'x-vercel-ip-city', 'x-vercel-ip-continent',
  'x-vercel-ip-country', 'x-vercel-ip-country-region', 'x-vercel-ip-latitude',
  'x-vercel-ip-longitude', 'x-vercel-ip-postal-code', 'x-vercel-ip-timezone',
  'x-forwarded-host', 'x-forwarded-proto', 'x-forwarded-for', 'x-real-ip',
]);

// Don't override upstream cache directives on dynamic paths (API/SSE/websocket).
function isDynamicPath(p) {
  return p.includes('/api/') || p.includes('/chat') || p.includes('/sse') || p.includes('/widget/api');
}

function resolveUpstream(rawValue) {
  if (!rawValue) return { error: 'missing upstream', status: 400 };
  let parsed;
  try {
    parsed = new URL(rawValue);
  } catch {
    return { error: 'invalid upstream URL', status: 400 };
  }
  if (parsed.protocol !== 'https:') {
    return { error: 'upstream must be https', status: 400 };
  }
  if (!parsed.hostname.endsWith('.up.railway.app')) {
    return { error: 'upstream host not allowed', status: 400 };
  }
  return { origin: parsed.origin };
}

export default async function handler(req) {
  const url = new URL(req.url);
  const subPath = url.searchParams.get('path') || '';

  const upstreamResolved = resolveUpstream(url.searchParams.get('u'));
  if (upstreamResolved.error) {
    return new Response(upstreamResolved.error, { status: upstreamResolved.status });
  }

  // Build upstream URL. FastAPI app is rooted at /, so /<v>-demo/foo becomes /foo.
  const forwardedQuery = new URLSearchParams(url.search);
  forwardedQuery.delete('u');
  forwardedQuery.delete('path');
  const qs = forwardedQuery.toString();
  const upstreamUrl = upstreamResolved.origin + '/' + subPath + (qs ? '?' + qs : '');

  const fwdHeaders = new Headers();
  for (const [k, v] of req.headers.entries()) {
    if (!STRIP_REQUEST_HEADERS.has(k.toLowerCase())) {
      fwdHeaders.set(k, v);
    }
  }

  let upstreamResp;
  try {
    upstreamResp = await fetch(upstreamUrl, {
      method: req.method,
      headers: fwdHeaders,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
      redirect: 'manual',
    });
  } catch (err) {
    return new Response(`upstream fetch failed: ${err.message}`, { status: 502 });
  }

  const respHeaders = new Headers(upstreamResp.headers);

  // Cache only safe methods on static paths.
  if (req.method === 'GET' && !isDynamicPath('/' + subPath)) {
    respHeaders.set('Cache-Control', CACHE_HEADER);
    respHeaders.set('CDN-Cache-Control', CACHE_HEADER);
    respHeaders.set('Vercel-CDN-Cache-Control', CACHE_HEADER);
    respHeaders.delete('Pragma');
    respHeaders.delete('Expires');
  }

  return new Response(upstreamResp.body, {
    status: upstreamResp.status,
    statusText: upstreamResp.statusText,
    headers: respHeaders,
  });
}
