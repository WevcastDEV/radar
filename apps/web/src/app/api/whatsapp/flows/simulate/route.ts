import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_BOT_FLOWS } from '@/lib/default-flows';
import { simulateFlowStep, BotFlow } from '@/lib/bot-flow';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { flowId, currentStepId, message, collectedData } = body;
    const authHeader = req.headers.get('Authorization') || '';

    try {
      const localRes = await fetch('http://127.0.0.1:3001/api/whatsapp/flows/simulate', {
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

    const flow =
      DEFAULT_BOT_FLOWS.find((f: BotFlow) => f.id === flowId) ||
      DEFAULT_BOT_FLOWS.find((f: BotFlow) => f.isActive) ||
      DEFAULT_BOT_FLOWS[0];

    const simResult = simulateFlowStep(flow, currentStepId, message || '', collectedData || {});

    return NextResponse.json({
      success: true,
      data: simResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao simular fluxo' },
      { status: 500 }
    );
  }
}
