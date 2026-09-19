import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  const envPath = path.join(process.cwd(), '.env.local');
  let key = process.env.GOOGLE_PLACES_API_KEY || '';

  if (!key && fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/GOOGLE_PLACES_API_KEY=(.*)/);
    if (match && match[1]) {
      key = match[1].trim();
    }
  }

  const masked = key && key.length > 8 
    ? `${key.substring(0, 6)}...${key.substring(key.length - 4)}` 
    : '';

  return NextResponse.json({
    hasKey: !!key && key !== 'sua_chave_aqui',
    maskedKey: masked
  });
}

export async function POST(request: Request) {
  try {
    const { key } = await request.json();
    if (!key || typeof key !== 'string') {
      return NextResponse.json({ success: false, error: 'Chave inválida' }, { status: 400 });
    }

    const cleanKey = key.trim();
    const envPath = path.join(process.cwd(), '.env.local');
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

    if (content.includes('GOOGLE_PLACES_API_KEY=')) {
      content = content.replace(/GOOGLE_PLACES_API_KEY=.*/g, `GOOGLE_PLACES_API_KEY=${cleanKey}`);
    } else {
      content += `\nGOOGLE_PLACES_API_KEY=${cleanKey}\n`;
    }

    fs.writeFileSync(envPath, content, 'utf8');
    process.env.GOOGLE_PLACES_API_KEY = cleanKey;

    return NextResponse.json({ success: true, message: 'Chave salva com sucesso!' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erro ao salvar chave' }, { status: 500 });
  }
}
