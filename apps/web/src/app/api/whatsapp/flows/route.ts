import { NextRequest } from 'next/server';
import { proxyWhatsAppFlows } from '@/lib/whatsapp-flow-proxy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return proxyWhatsAppFlows(req, '');
}

export async function POST(req: NextRequest) {
  return proxyWhatsAppFlows(req, '');
}
