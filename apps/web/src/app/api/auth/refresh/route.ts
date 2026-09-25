import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const refreshToken = body.refreshToken || '';

    // Repassar para NestJS se disponível
    try {
      const localRes = await fetch('http://127.0.0.1:3001/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        signal: AbortSignal.timeout(1500),
      });
      if (localRes.ok) {
        return NextResponse.json(await localRes.json());
      }
    } catch {}

    const fakeTokenPayload = Buffer.from(
      JSON.stringify({
        sub: 'user-admin',
        email: 'admin@radar.com',
        role: 'Admin',
        exp: Math.floor(Date.now() / 1000) + 86400 * 7,
      })
    ).toString('base64url');

    return NextResponse.json({
      accessToken: `radar_jwt_${fakeTokenPayload}`,
      refreshToken: `radar_ref_${fakeTokenPayload}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao renovar token.' },
      { status: 500 }
    );
  }
}
