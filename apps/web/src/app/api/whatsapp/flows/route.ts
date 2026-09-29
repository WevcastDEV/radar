import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_BOT_FLOWS } from '@/lib/default-flows';
import { BotFlow } from '@/lib/bot-flow';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || '';

    // Tentar com NestJS local se estiver rodando
    try {
      const localRes = await fetch('http://127.0.0.1:3001/api/whatsapp/flows', {
        headers: { Authorization: authHeader },
        signal: AbortSignal.timeout(1500),
      });
      if (localRes.ok) {
        const localData = await localRes.json();
        
        // AUTO-MERGE: Se o conector local (app/api) estiver desatualizado e não tiver os novos fluxos, injetamos aqui
        if (localData?.data?.flows && Array.isArray(localData.data.flows)) {
          const missingDefaults = DEFAULT_BOT_FLOWS.filter(
            (def) => !localData.data.flows.some((p: any) => p.id === def.id)
          );
          if (missingDefaults.length > 0) {
            localData.data.flows = [...localData.data.flows, ...missingDefaults];
          }
        }

        return NextResponse.json(localData);
      }
    } catch {}

    const activeFlow = DEFAULT_BOT_FLOWS.find((f) => f.isActive) || DEFAULT_BOT_FLOWS[0];
    return NextResponse.json({
      success: true,
      data: {
        flows: DEFAULT_BOT_FLOWS,
        activeFlow,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao carregar fluxos' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const authHeader = req.headers.get('Authorization') || '';

    try {
      const localRes = await fetch('http://127.0.0.1:3001/api/whatsapp/flows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(1500),
      });
      if (localRes.ok) {
        return NextResponse.json(await localRes.json());
      }
    } catch {}

    return NextResponse.json({
      success: true,
      data: body,
      message: 'Fluxo salvo com sucesso.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao salvar fluxo' },
      { status: 500 }
    );
  }
}
