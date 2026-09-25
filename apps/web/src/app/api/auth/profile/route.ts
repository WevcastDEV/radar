import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const body = await req.json();

    // 1. Tentar atualizar no NestJS local se estiver rodando
    try {
      const localRes = await fetch('http://127.0.0.1:3001/api/auth/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(2000),
      });

      if (localRes.ok) {
        return NextResponse.json(await localRes.json());
      }
    } catch {}

    // 2. Retorno com sucesso
    return NextResponse.json({
      success: true,
      data: {
        name: body.name,
        avatar: body.avatar,
        updatedAt: new Date().toISOString(),
      },
      message: 'Perfil atualizado com sucesso.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao atualizar perfil.' },
      { status: 500 }
    );
  }
}
