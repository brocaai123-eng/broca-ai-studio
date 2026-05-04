export async function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  label: string,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);

  try {
    // If the underlying library supports AbortSignal via global fetch, it will stop.
    // If not, this still gives us a consistent error boundary.
    const result = await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(new Error(`${label} timed out after ${ms}ms`)));
      }),
    ]);
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

export async function retryOnce<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    // small backoff
    await new Promise((r) => setTimeout(r, 400));
    return await fn();
  }
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  opts?: { attempts?: number; baseDelayMs?: number; maxDelayMs?: number },
): Promise<T> {
  const attempts = Math.max(1, opts?.attempts ?? 4);
  const baseDelayMs = Math.max(50, opts?.baseDelayMs ?? 350);
  const maxDelayMs = Math.max(baseDelayMs, opts?.maxDelayMs ?? 4000);

  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, i));
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Retry failed');
}

