import { Signal, batch } from './signals';
/**
 * 
 * @param signals 
 * @param task 
 * @returns 
 *
 * Executes an async task. If it fails, reverts signals to their previous state.
 * Use Case: Ideal for complex operations (e.g., form submissions, multi-step processes) where you want to ensure that if something goes wrong, the UI doesn't end up in a broken state. By batching the reversion, we minimize unnecessary renders and ensure a smooth user experience.
 * Example Usage:
 * await withReversion([userSignal, formSignal], async () => {
 *   // 1. Optimistically update UI
 *   userSignal.set({ ...userSignal.get(), name: "John Doe" });
 *   formSignal.set({ ...formSignal.get(), submitted: true });
 *  // 2. Perform async operation (e.g., API call)
 *  await api.updateUser({ name: "John Doe" });
 *  // If the API call fails, both userSignal and formSignal will revert to their previous states in a single batch, preventing inconsistent UI states.
 *    // If the API call succeeds, the optimistic updates remain, and the UI reflects the new state.
 *  // 3. Any error thrown will be logged, and the error will propagate for further handling (e.g., showing an error message).
 * });
 * 
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
    console.error("[Nabd] Operation failed. State reverted.", error);
    throw error; // Re-throw so the UI can show an error message
  }
}