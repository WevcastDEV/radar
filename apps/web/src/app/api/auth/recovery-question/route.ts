import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();

    // Tentar com NestJS se online
    try {
      const localRes = await fetch('http://127.0.0.1:3001/api/auth/recovery-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(1500),
      });
      if (localRes.ok) {
        return NextResponse.json(await localRes.json());
      }
    } catch {}

    // Resposta padrão caso offline/cloud
    return NextResponse.json({
      success: true,
      data: {
        question: 'Qual era o nome do seu primeiro animal de estimação?',
        hasQuestion: true,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao consultar pergunta.' },
      { status: 500 }
    );
  }
}
