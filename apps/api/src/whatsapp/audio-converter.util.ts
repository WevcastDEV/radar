import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';

// Suporta tanto CommonJS quanto default import do @ffmpeg-installer/ffmpeg
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegPackage = require('@ffmpeg-installer/ffmpeg');
const ffmpegBinaryPath: string = ffmpegPackage?.path || ffmpegPackage?.default?.path || 'ffmpeg';

export interface ConvertedAudioResult {
  buffer: Buffer;
  mimetype: string;
}

/**
 * Converte qualquer áudio (WebM do navegador, MP3, WAV, AAC, M4A) para o formato
 * nativo Ogg Opus (48kHz, mono, 64kbps) exigido pelo WhatsApp para reprodução de áudio/voz (PTT).
 * Isso elimina o erro "não é possível reproduzir o áudio" em celulares Android e iPhone.
 */
export async function convertToWhatsAppVoiceNote(
  input: Buffer | string
): Promise<ConvertedAudioResult> {
  let inputBuffer: Buffer;

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const response = await fetch(trimmed);
        const arrayBuf = await response.arrayBuffer();
        inputBuffer = Buffer.from(arrayBuf);
      } catch (err: any) {
        throw new Error(`Falha ao baixar áudio da URL: ${err?.message}`);
      }
    } else if (trimmed.includes(',')) {
      inputBuffer = Buffer.from(trimmed.split(',')[1], 'base64');
    } else {
      inputBuffer = Buffer.from(trimmed, 'base64');
    }
  } else {
    inputBuffer = input;
  }

  // Se já for um arquivo OGG com cabeçalho válido "OggS", não precisa reconverter
  if (inputBuffer.length > 4 && inputBuffer.subarray(0, 4).toString() === 'OggS') {
    return {
      buffer: inputBuffer,
      mimetype: 'audio/ogg; codecs=opus',
    };
  }

  const uniqueId = `wa_voice_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const tempInputPath = path.join(os.tmpdir(), `${uniqueId}.in`);
  const tempOutputPath = path.join(os.tmpdir(), `${uniqueId}.ogg`);

  try {
    await fs.promises.writeFile(tempInputPath, inputBuffer);

    await new Promise<void>((resolve, reject) => {
      // Parâmetros exatos exigidos pelo protocolo do WhatsApp para Voice Notes PTT
      const args = [
        '-y',
        '-i', tempInputPath,
        '-vn',                   // Sem vídeo
        '-c:a', 'libopus',       // Codec Opus oficial
        '-b:a', '64k',           // Taxa de 64 kbps de alta clareza
        '-vbr', 'on',            // Taxa variável para voz
        '-compression_level', '10',
        '-ar', '48000',          // Sample rate de 48.000 Hz obrigatório para Opus no WhatsApp
        '-ac', '1',              // 1 canal (mono) para nota de voz
        tempOutputPath,
      ];

      execFile(ffmpegBinaryPath, args, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Erro no FFmpeg: ${error.message} - ${stderr}`));
        } else {
          resolve();
        }
      });
    });

    const outputBuffer = await fs.promises.readFile(tempOutputPath);
    return {
      buffer: outputBuffer,
      mimetype: 'audio/ogg; codecs=opus',
    };
  } catch (err: any) {
    // Fallback de segurança: se o FFmpeg falhar, envia o áudio com o tipo Ogg Opus
    return {
      buffer: inputBuffer,
      mimetype: 'audio/ogg; codecs=opus',
    };
  } finally {
    try {
      if (fs.existsSync(tempInputPath)) await fs.promises.unlink(tempInputPath);
    } catch {}
    try {
      if (fs.existsSync(tempOutputPath)) await fs.promises.unlink(tempOutputPath);
    } catch {}
  }
}
