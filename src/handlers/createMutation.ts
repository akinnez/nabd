import { action } from "../core/action";
import { withReversion } from "../core/reversion";
import { Signal } from "../core/signals";
import { createAction } from "./createAction";

/**
 * @param targetSignal 
 * @param config 
 * @returns 
 * 
 * createMutation is a powerful utility that simplifies the implementation of optimistic UI updates in React applications. It allows you to define a mutation function that performs an asynchronous operation (like a network request) while automatically handling the optimistic update and rollback logic. By leveraging the withReversion utility, it ensures that if the mutation fails, the target signal will revert to its previous state, providing a seamless user experience even in the face of errors.
 * Example Usage:
 * const userSignal = signal({ name: "Jane Doe", age: 30 });
 * const { execute, isPending, error } = createMutation(userSignal, {   
 * mutation: async (data, signal) => {
 *  const response = await fetch("/api/updateUser", { method: "POST", body: JSON.stringify(data), signal });
 * if (!response.ok) throw new Error("Update failed");
 * return response.json();
 * },
 * optimistic: (data, current) => ({ ...current, ...data }), // Merge updates for optimistic UI
 * onSuccess: (result, current) => ({ ...current, ...result }) // Final sync with server response
 *  });
 * // To execute the mutation:
 * execute({ name: "John Doe" })
 *   .then(result => console.log("Update successful:", result))
 *   .catch(err => console.error("Update failed:", err));
 */


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