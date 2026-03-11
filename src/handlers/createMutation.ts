import { action } from "../core/action";
import { withReversion } from "../core/reversion";
import { Signal } from "../core/signals";
import { createAction } from "./createAction";

    export function createMutation<TInput, TResult, TState>(
  targetSignal: Signal<TState>,
  config: {
    mutation: (data: TInput, signal?: AbortSignal) => Promise<TResult>;
    optimistic?: (data: TInput, current: TState) => TState;
    onSuccess?: (result: TResult, current: TState) => TState;
  }
) {
  // Use the new atomic createAction internally
  const base = createAction(config.mutation);

  const execute = action(async (data: TInput): Promise<TResult> => {
    // Wrap in withReversion for the automatic rollback logic
    return await withReversion([targetSignal], async () => {
      
      // 1. Apply Optimistic Update immediately
      if (config.optimistic) {
        targetSignal.update(curr => config.optimistic!(data, curr));
      }

      try {
        // 2. Execute the network call via our base action
        const result = await base.execute(data);

        // 3. Final Sync on Success
        if (config.onSuccess) {
          targetSignal.update(curr => config.onSuccess!(result, curr));
        }

        return result;
      } catch (err) {
        // withReversion handles the rollback of targetSignal automatically
        throw err;
      }
    });
  });

  return { 
    execute, 
    isPending: base.isPending, 
    error: base.error,
    abort: base.abort 
  };
}