import { Signal, batch } from './signals';

/**
 * Executes an async task. If it fails, reverts signals to their previous state.
 */
export async function withReversion<R>(
  signals: Signal<any>[], 
  task: () => Promise<R>
):Promise<R> {
  // 1. Take a snapshot of all involved signals
  const snapshots = signals.map(s => s.peek());

  try {
    return await task();
  } catch (error) {
    // 2. If the task fails, roll back in a single batch
    batch(() => {
      signals.forEach((s, i) => s.set(snapshots[i]));
    });
    console.error("[Pulse] Operation failed. State reverted.", error);
    throw error; // Re-throw so the UI can show an error message
  }
}