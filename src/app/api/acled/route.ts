import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAcledToken() {
  if (process.env.ACLED_ACCESS_TOKEN) return process.env.ACLED_ACCESS_TOKEN;
  if (!process.env.ACLED_USERNAME || !process.env.ACLED_PASSWORD) return undefined;
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  const response = await fetch('https://acleddata.com/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username: process.env.ACLED_USERNAME,
      password: process.env.ACLED_PASSWORD,
      grant_type: 'password', client_id: 'acled', scope: 'authenticated',
    }),
  });
  if (!response.ok) throw new Error(`ACLED OAuth respondeu ${response.status}.`);
  const data = await response.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error('ACLED OAuth não retornou access_token.');
  cachedToken = { value: data.access_token, expiresAt: Date.now() + Math.max(60, (data.expires_in || 86400) - 60) * 1000 };
  return data.access_token;
}

export async function GET(request: Request) {
  if (!process.env.ACLED_ACCESS_TOKEN && (!process.env.ACLED_USERNAME || !process.env.ACLED_PASSWORD)) {
    return NextResponse.json({
      error: { status: 503, message: 'ACLED não configurado. Defina ACLED_ACCESS_TOKEN ou ACLED_USERNAME/ACLED_PASSWORD no ambiente do servidor.' },
    }, { status: 503 });
  }
  const input = new URL(request.url).searchParams;
  const acledUrl = new URL('https://acleddata.com/api/acled/read');
  for (const key of ['limit', 'event_date', 'country', 'fields', 'page', 'terms']) {
    const value = input.get(key);
    if (value) acledUrl.searchParams.set(key, value);
  }
  const token = await getAcledToken();
  const response = await fetch(acledUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    next: { revalidate: 900 },
  });
  const body = await response.text();
  return new NextResponse(body, { status: response.status, headers: { 'content-type': response.headers.get('content-type') || 'application/json' } });
}
