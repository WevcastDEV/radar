const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const LOCAL_STATUS_URL = 'http://127.0.0.1:3001/api/whatsapp/status';
const CLOUD_SYNC_URL = 'https://radar-de-oportunidades-virid.vercel.app/api/whatsapp/status';

let openedBrowserOnce = false;

function fetchJson(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = urlStr.startsWith('https:');
    const client = isHttps ? https : http;
    const url = new URL(urlStr);

    const req = client.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        timeout: 3000
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch {
            resolve({ raw });
          }
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

function updateLocalHtml(data) {
  const qrCode = data.qrCode;
  const connected = data.connected;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Radar de Oportunidades - Conectar WhatsApp</title>
  <meta http-equiv="refresh" content="2">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 32px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    h1 { font-size: 20px; margin: 0 0 8px; color: #38bdf8; }
    p { font-size: 13px; color: #94a3b8; margin: 0 0 24px; line-height: 1.5; }
    .qr-box { background: #fff; padding: 16px; border-radius: 16px; display: inline-block; margin-bottom: 20px; }
    .qr-box img { display: block; width: 260px; height: 260px; }
    .badge { display: inline-block; padding: 6px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; }
    .badge-success { background: #059669; color: #fff; }
    .badge-warning { background: #d97706; color: #fff; }
    .instrucoes { text-align: left; background: #0f172a; border-radius: 12px; padding: 14px; font-size: 12px; color: #cbd5e1; margin-top: 16px; }
    .instrucoes ol { margin: 0; padding-left: 20px; }
    .instrucoes li { margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>📱 Conector WhatsApp Local</h1>
    <p>Radar de Oportunidades PRO</p>

    ${connected
      ? `<div style="padding: 24px 0;">
           <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
           <div class="badge badge-success">WhatsApp Pareado com Sucesso!</div>
           <p style="margin-top: 16px; color: #34d399;">O robô já está ativo no seu computador e sincronizado com o painel.</p>
         </div>`
      : qrCode
        ? `<div class="qr-box">
             <img src="${qrCode}" alt="QR Code WhatsApp" />
           </div>
           <div><span class="badge badge-warning">Aguardando Leitura da Câmera</span></div>
           <div class="instrucoes">
             <strong>Como Conectar:</strong>
             <ol>
               <li>Abra o WhatsApp no seu celular</li>
               <li>Toque nos 3 pontinhos ou Configurações</li>
               <li>Selecione <strong>Aparelhos Conectados</strong></li>
               <li>Toque em <strong>Conectar um Aparelho</strong> e aponte para cá</li>
             </ol>
           </div>`
        : `<div style="padding: 40px 0;">
             <p>⏳ Inicializando motor do WhatsApp...<br>O QR Code surgirá em instantes.</p>
           </div>`
    }
  </div>
</body>
</html>`;

  const htmlPath = path.join(__dirname, 'abrir-qrcode.html');
  fs.writeFileSync(htmlPath, html, 'utf-8');

  // Abre automaticamente o navegador na primeira vez que o QR code for gerado
  if (!openedBrowserOnce && (qrCode || connected)) {
    openedBrowserOnce = true;
    try {
      const { exec } = require('child_process');
      const startCmd = process.platform === 'win32' ? `start "" "${htmlPath}"` : `open "${htmlPath}"`;
      exec(startCmd);
    } catch {}
  }
}

async function loop() {
  try {
    const res = await fetchJson(LOCAL_STATUS_URL);
    if (res && res.data) {
      updateLocalHtml(res.data);

      // Envia sincronização para a nuvem Vercel
      try {
        await fetchJson(CLOUD_SYNC_URL, {
          method: 'POST',
          body: {
            deviceId: res.data.deviceId || 'default',
            data: res.data
          }
        });
      } catch (cloudErr) {
        // Nuvem temporariamente offline ou sem internet
      }
    }
  } catch {}

  setTimeout(loop, 2000);
}

console.log('[Sync] Iniciando sincronizador de QR Code e Nuvem...');
loop();
