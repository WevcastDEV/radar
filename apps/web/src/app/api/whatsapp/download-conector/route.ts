import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const candidatePaths = [
      path.join(process.cwd(), 'public', 'downloads', 'radar-conector-whatsapp.zip'),
      path.join(process.cwd(), 'apps', 'web', 'public', 'downloads', 'radar-conector-whatsapp.zip'),
      path.resolve(__dirname, '../../../../../../public/downloads/radar-conector-whatsapp.zip'),
    ];

    let zipPath = candidatePaths.find(p => fs.existsSync(p));

    if (!zipPath) {
      return NextResponse.json(
        { success: false, message: 'Arquivo do conector não encontrado.' },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(zipPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="radar-conector-whatsapp.zip"',
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Erro ao realizar download do conector.' },
      { status: 500 }
    );
  }
}
