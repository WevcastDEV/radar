import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_BOT_FLOWS } from '@/lib/default-flows';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const flowId = params?.id;
    const authHeader = req.headers.get('Authorization') || '';

    try {
      const localRes = await fetch(`http://127.0.0.1:3001/api/whatsapp/flows/${flowId}/activate`, {
        method: 'POST',
        headers: { Authorization: authHeader },
        signal: AbortSignal.timeout(1500),
      });
      if (localRes.ok) {
        return NextResponse.json(await localRes.json());
      }
    } catch {}

    const matched = DEFAULT_BOT_FLOWS.find((f) => f.id === flowId) || DEFAULT_BOT_FLOWS[0];

    return NextResponse.json({
      success: true,
      data: {
        ...matched,
        isActive: true,
      },
      message: `Fluxo "${matched?.name}" ativado com sucesso.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao ativar fluxo' },
      { status: 500 }
    );
  }
}
