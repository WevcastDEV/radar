import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function PUT() {
  return NextResponse.json({ success: true, message: 'Lead movido no pipeline com sucesso.' });
}
