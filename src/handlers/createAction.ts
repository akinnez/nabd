import { action } from "../core/action";
import { signal } from "../core/signals";

export function createAction<F extends (...args: any[]) => Promise<any>>(
  mutationFn: F
) {
  const isPending = signal(false);
  const error = signal<string | null>(null);
  let abortController: AbortController | null = null;

  const execute = action(async (data: Parameters<F>[0]): Promise<ReturnType<F>> => {
    // 1. ATOMIC GUARD: Prevent double-execution if already pending
    if (isPending.get()) {
      throw new Error("ACTION_BUSY");
    }

    // 2. CLEANUP: Cancel previous attempt if it somehow exists
    if (abortController) abortController.abort();
    abortController = new AbortController();

    isPending.set(true);
    error.set(null);

    try {
      return await mutationFn(data, abortController.signal);
    } catch (e: any) {
      if (e.name === "AbortError") throw e;

      // Improved Error Extraction (Fintech Standard)
      const message = e?.response?.data?.message || e?.message || "Operation failed.";
      error.set(message);
      throw e?.response?.data || e;
    } finally {
      isPending.set(false);
    }
  });

  return { execute, isPending, error, abort: () => abortController?.abort() };
}