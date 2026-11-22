export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NODE_ENV === 'production') return;
  const { cleanupExpiredScans } = await import('./src/lib/store');
  void cleanupExpiredScans().catch((error) => console.error('[scan-retention] initial cleanup failed', error));
  const timer = setInterval(() => {
    void cleanupExpiredScans().catch((error) => console.error('[scan-retention] daily cleanup failed', error));
  }, 24 * 60 * 60 * 1000);
  timer.unref();
}
