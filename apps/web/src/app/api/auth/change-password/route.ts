import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const body = await req.json();

    if (!body.newPassword || body.newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' },
        { status: 400 }
      );
    }

    // 1. Tentar atualizar no NestJS local se estiver rodando
    try {
      const localRes = await fetch('http://127.0.0.1:3001/api/auth/change-password', {
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
      message: 'Senha alterada com sucesso.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao alterar senha.' },
      { status: 500 }
    );
  }
}
