import { action } from "../core/action";
import { signal } from "../core/signals";
import { PulseMiddleware } from "../types/utils";
import { Pulse } from "../utils/pulse";






/**
 * @param mutationFn 
 * @returns 
 * 
 * Creates a standardized action for performing asynchronous mutations with built-in state management for pending status and error handling. This utility ensures that only one instance of the action can run at a time, preventing race conditions and providing a consistent API for handling asynchronous operations across the application.
 * 
 * Example Usage:   
 * const { execute, isPending, error, abort } = createAction(async (data, signal) => {
 *   const response = await fetch("/api/update", { method: "POST", body: JSON.stringify(data), signal });
 *   if (!response.ok) throw new Error("Update failed");
 *   return response.json();
 * });
 * 
 * // To execute the action:
 * execute({ name: "John Doe" })
 *   .then(result => console.log("Success:", result))
 *   .catch(err => console.error("Error:", err));
 * 
 * // To abort an ongoing action:
 * abort();
 */

export function createAction<F extends (...args: any[]) => Promise<any>>(
  mutationFn: F,
  options: { middleware?: PulseMiddleware<Parameters<F>[0], ReturnType<F>>[] } = {}
) {
  const isPending = signal(false);
  const error = signal<string | null>(null);
  let abortController: AbortController | null = null;

  const execute = action(async (data: Parameters<F>[0]): Promise<ReturnType<F>> => {
    const allMiddleware = [...Pulse.getConfig().middleware, ...(options.middleware || [])];

    let currentData = data;
    // 1. ATOMIC GUARD: Prevent double-execution if already pending
    if (isPending.get()) {
      throw new Error("ACTION_BUSY");
    }

    // 2. CLEANUP: Cancel previous attempt if it somehow exists
    if (abortController) abortController.abort();
    abortController = new AbortController();

    isPending.set(true);
    error.set(null);

    // Apply middleware before the mutation
    for (const m of allMiddleware) {
      const transformed = await m.onBefore?.(currentData);
      if (transformed !== undefined) currentData = transformed;
    }

    try {
      const result = await mutationFn(currentData, abortController.signal);
     allMiddleware.forEach(m => m.onSuccess?.(result, currentData));

      return result;
    } catch (e: any) {
      if (e.name === "AbortError") throw e;

      // Improved Error Extraction (Fintech Standard)
      allMiddleware.forEach(m => m.onError?.(e, currentData));
      const message = e?.response?.data?.message || e?.message || "Operation failed.";
      error.set(message);
      throw e?.response?.data || e;
    } finally {
      isPending.set(false);
    }
  });

  return { execute, isPending, error, abort: () => abortController?.abort() };
}