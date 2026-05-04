import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  const jobId = (await context.params).jobId;
  const token = req.cookies.get('accessToken')?.value;
  const targetUrl = `${config.apiUrl}/inventory/excel-jobs/${jobId}/download`;

  const headers = new Headers();
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }

  const res = await fetch(targetUrl, {
    method: 'GET',
    headers,
    cache: 'no-store',
    redirect: 'manual',
    signal: AbortSignal.timeout(300_000),
  });

  if (res.status === 307 || res.status === 302 || res.status === 301) {
    const location = res.headers.get('location');
    if (location) {
      return NextResponse.redirect(location, { status: 307 });
    }
  }

  if (!res.ok) {
    let payload: Record<string, unknown> = { status: 'error', code: 'DOWNLOAD_FAILED' };
    try {
      const cloned = res.clone();
      try {
        payload = (await cloned.json()) as Record<string, unknown>;
      } catch {
        payload.message = await cloned.text();
      }
    } catch {
      // Fallback if clone or read fails
    }
    return NextResponse.json(payload, { status: res.status });
  }

  const outHeaders = new Headers();
  const cd = res.headers.get('content-disposition');
  if (cd) outHeaders.set('content-disposition', cd);
  const ct = res.headers.get('content-type');
  if (ct) outHeaders.set('content-type', ct);

  return new NextResponse(res.body, { status: res.status, headers: outHeaders });
}
