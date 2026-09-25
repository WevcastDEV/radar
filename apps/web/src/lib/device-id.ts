'use client';

const DEVICE_ID_KEY = 'radar_machine_device_id_v1';
const DEVICE_NAME_KEY = 'radar_machine_name_v1';

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'default_server_device';
  }

  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id || id.trim().length === 0) {
      // Gera identificador único estável para este computador/navegador
      const randomHex = Math.random().toString(36).substring(2, 10);
      const timestamp = Date.now().toString(36).substring(4);
      id = `pc_${randomHex}${timestamp}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch (e) {
    console.warn('Erro ao acessar localStorage para deviceId:', e);
    return 'fallback_device';
  }
}

export function getDeviceName(): string {
  if (typeof window === 'undefined') {
    return 'Computador Local';
  }

  try {
    const savedName = localStorage.getItem(DEVICE_NAME_KEY);
    if (savedName && savedName.trim().length > 0) {
      return savedName.trim();
    }
  } catch {}

  const deviceId = getOrCreateDeviceId();
  const shortId = deviceId.replace('pc_', '').substring(0, 6).toUpperCase();
  return `Este Computador (#${shortId})`;
}

export function setDeviceName(name: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEVICE_NAME_KEY, name.trim());
  } catch {}
}
