/** Conversational pacing only. Presence is not an anti-spam control. */
export function typingDurationMs(text: string): number {
  return Math.min(6000, Math.max(1200, Array.from(text.trim()).length * 28));
}

export async function withTyping<T>(options: {
  text: string;
  enabled: boolean;
  presence: (state: 'composing' | 'paused') => Promise<unknown>;
  assertAllowed: () => void;
  send: () => Promise<T>;
  sleep?: (ms: number) => Promise<void>;
}): Promise<T> {
  const sleep = options.sleep || ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
  options.assertAllowed();
  try {
    if (options.enabled) {
      try { await options.presence('composing'); } catch { /* Presence is best effort. */ }
      let remaining = typingDurationMs(options.text);
      while (remaining > 0) {
        const step = Math.min(250, remaining);
        await sleep(step);
        options.assertAllowed();
        remaining -= step;
      }
    }
    options.assertAllowed();
    return await options.send();
  } finally {
    if (options.enabled) {
      try { await options.presence('paused'); } catch { /* Never mask send outcome. */ }
    }
  }
}
