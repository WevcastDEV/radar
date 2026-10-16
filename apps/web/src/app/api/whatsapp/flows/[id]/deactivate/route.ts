import { NextRequest } from 'next/server';
import { proxyWhatsAppFlows } from '@/lib/whatsapp-flow-proxy';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyWhatsAppFlows(req, `/${encodeURIComponent(params.id)}/deactivate`);
}
