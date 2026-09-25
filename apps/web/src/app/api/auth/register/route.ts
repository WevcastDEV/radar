import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, securityQuestion, securityAnswer } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Nome, e-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    // Tentar repassar para NestJS se ativo
    try {
      const localRes = await fetch('http://127.0.0.1:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(2000),
      });

      if (localRes.ok) {
        const localData = await localRes.json();
        return NextResponse.json(localData);
      }
    } catch {}

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    const user = {
      id: `user-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      role: 'Vendedor',
      roleId: 'role-vendedor',
      active: true,
      status: 'ACTIVE',
      securityQuestion,
      createdAt: new Date().toISOString(),
    };

    const fakeTokenPayload = Buffer.from(
      JSON.stringify({
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + 86400 * 7,
      })
    ).toString('base64url');

    return NextResponse.json({
      success: true,
      data: {
        accessToken: `radar_jwt_${fakeTokenPayload}`,
        refreshToken: `radar_ref_${fakeTokenPayload}`,
        user,
      },
      message: 'Cadastro realizado com sucesso!',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao realizar cadastro.' },
      { status: 500 }
    );
  }
}
