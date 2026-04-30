import { NextRequest, NextResponse } from 'next/server';
import { ErrorCode } from '@repo/types';
import { logger } from '../../../lib/logger';
import { config } from '../../../lib/config';

// Production will override this via standard ENVs (e.g., in docker-compose)
const API_BASE_URL = config.apiUrl;
const PROXY_TIMEOUT_MS = 10000;

// Whitelisted API domains the BFF is allowed to forward. Add more root paths as needed.
const ALLOWED_SERVICES = ['inventory', 'users', 'auth'];

/**
 * Filter Request Headers
 * Dropping unsafe hops and forwarding safe parameters only
 */
function cleanRequestHeaders(req: NextRequest, tokenCookie?: string): Headers {
  const customHeaders = new Headers();
  
  // Forward explicit Content-Type if exists (except it breaks boundary for multipart sometimes, so only safe strings)
  const contentType = req.headers.get('content-type');
  if (contentType && !contentType.includes('multipart/form-data')) {
    customHeaders.set('content-type', contentType);
  }

  // Inject Authentication from HttpOnly cookies (preferred, ONLY fallback removed)
  if (tokenCookie) {
    customHeaders.set('authorization', `Bearer ${tokenCookie}`);
  }

  // Inject Request ID
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  customHeaders.set('x-request-id', requestId);

  // Forward specific safe headers
  const xRequestedWith = req.headers.get('x-requested-with');
  if (xRequestedWith) customHeaders.set('x-requested-with', xRequestedWith);

  return customHeaders;
}

/**
 * Decode JWT safely without signature verification (done by backend)
 */
function decodeJwtPayload(token: string) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

/**
 * Core Proxy Handler
 */
async function handleProxy(
  req: NextRequest,
  { params }: { params: Promise<{ proxy: string[] }> }
) {
  const resolvedParams = await params;
  const servicePrefix = resolvedParams.proxy[0];
  
  if (!servicePrefix || !ALLOWED_SERVICES.includes(servicePrefix)) {
    return NextResponse.json(
      { code: ErrorCode.COMMON.UNAUTHORIZED, message: 'Service boundary not allowed' },
      { status: 403 }
    );
  }

  const path = '/' + resolvedParams.proxy.join('/');

  // 1. Extract Token & Enforce RBAC
  const tokenCookie = req.cookies.get('accessToken')?.value;
  if (tokenCookie) {
    const payload = decodeJwtPayload(tokenCookie);
    const userRole = payload?.role || 'guest';
    const permissions = payload?.permissions || [];
    
    // Example logic: if inventory write, check permissions
    if (servicePrefix === 'inventory' && req.method !== 'GET') {
      if (userRole !== 'admin' && !permissions.includes('inventory:write')) {
        logger.error({ path, role: userRole }, 'Forbidden access to inventory write operations');
        return NextResponse.json(
          { code: ErrorCode.COMMON.UNAUTHORIZED, message: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }
  }

  const queryParams = req.nextUrl.search;
  const targetUrl = `${API_BASE_URL}${path}${queryParams}`;

  const outgoingHeaders = cleanRequestHeaders(req, tokenCookie);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  // Prepare outgoing fetch configurations
  const initContext: RequestInit = {
    method: req.method,
    headers: outgoingHeaders,
    signal: controller.signal,
    // Note: Next.js edge handles duplication of requests fine, caching should be disabled for transactional apis
    cache: 'no-store', 
  };

  // Attach HTTP bodies smoothly via Streams instead of text() to support Multipart FormData uploads
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    // @ts-ignore - Required by Next.js when proxying raw body stream
    initContext.duplex = 'half';
    // @ts-ignore 
    initContext.body = req.body;
  }

  const startTime = Date.now();
  const reqId = outgoingHeaders.get('x-request-id');
  logger.info({ requestId: reqId, method: req.method, url: targetUrl }, 'Outgoing proxy request');

  try {
    const upstreamRes = await fetch(targetUrl, initContext);
    clearTimeout(timeoutId);
    
    const timeTaken = Date.now() - startTime;
    logger.info({ requestId: reqId, method: req.method, status: upstreamRes.status, duration: timeTaken }, 'Upstream proxy response');

    // Proxy the response exact contents to raw buffer to pass any dynamic structures transparently depending on status
    const resultBuffer = await upstreamRes.arrayBuffer();

    if (!upstreamRes.ok) {
      try {
        const textDecoded = new TextDecoder().decode(resultBuffer);
        const parsedJson = textDecoded ? JSON.parse(textDecoded) : {};
        
        // Ensure format falls back consistently
        const standardizedResponse = {
          code: parsedJson.code || ErrorCode.COMMON.INTERNAL_ERROR,
          message: parsedJson.message || upstreamRes.statusText || 'Upstream Error Encountered',
          errors: parsedJson.errors || undefined
        };
        
        logger.error({ requestId: reqId, status: upstreamRes.status, response: standardizedResponse }, 'Upstream returned an error');
        return NextResponse.json(standardizedResponse, { status: upstreamRes.status });
      } catch {
         // Generic block handler if it isn't JSON
         logger.error({ requestId: reqId, status: upstreamRes.status }, 'Upstream returned generic non-JSON error');
         return NextResponse.json(
          { code: ErrorCode.COMMON.INTERNAL_ERROR, message: 'Upstream returned invalid generic state' },
          { status: upstreamRes.status }
        );
      }
    }

    // Success response passthrough handling using streaming constructor
    const customResponseHeaders = new Headers();
    const upContentType = upstreamRes.headers.get('content-type');
    if (upContentType) customResponseHeaders.set('content-type', upContentType);

    return new NextResponse(resultBuffer, {
      status: upstreamRes.status,
      headers: customResponseHeaders,
    });

  } catch (error: any) {
    clearTimeout(timeoutId);
    const timeTaken = Date.now() - startTime;
    
    // Explicit timeout categorization
    if (error.name === 'AbortError') {
      logger.error({ requestId: reqId, duration: timeTaken }, 'Service Gateway Timeout');
      return NextResponse.json(
        { code: ErrorCode.COMMON.INTERNAL_ERROR, message: 'Service Gateway Timeout' },
        { status: 504 }
      );
    }
    
    // DNS/Network crashes
    logger.error({ requestId: reqId, duration: timeTaken, errMessage: error.message }, 'Backend unreachable');
    return NextResponse.json(
      { code: ErrorCode.COMMON.INTERNAL_ERROR, message: 'Backend is unreachable or down' },
      { status: 502 }
    );
  }
}

// Next.js App Router exports map the allowed HTTP verbs
export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
