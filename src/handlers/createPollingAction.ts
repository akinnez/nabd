import { action } from "../core/action";
import { signal } from "../core/signals";
import { createAction } from "./createAction";

interface PollingConfig<TResult> {
  interval?: number;     // How often to poll (default 3s)
  maxAttempts?: number;  // Safety limit
  isFinal: (res: TResult) => boolean; // Logic to stop polling
}

/**
 * 
 * @param mutationFn 
 * @param config 
 * @returns 
 * 
 * createPollingAction is a specialized utility designed for scenarios where you need to repeatedly execute an asynchronous operation until a certain condition is met. This is particularly useful for tasks like waiting for a long-running process to complete on the server, where you want to poll for updates at regular intervals. The utility provides built-in state management for tracking the polling status and ensures that only one polling operation can run at a time, preventing race conditions and ensuring a consistent API for handling these types of asynchronous workflows across your application.
 * 
 * Example Usage:
 * const { execute, isPolling } = createPollingAction(async (taskId) => {
 *   const response = await fetch(`/api/taskStatus/${taskId}`);
 *   if (!response.ok) throw new Error("Failed to fetch task status");
 *   return response.json();
 * }, {
 *   interval: 5000, // Poll every 5 seconds
 *   maxAttempts: 10, // Stop after 10 attempts to prevent infinite polling
 *  isFinal: (res) => res.status === "completed" // Stop polling when task is completed
 * });
 * // To start polling:
 * execute("12345")
 *   .then(result => console.log("Task completed:", result))
 *   .catch(err => console.error("Polling failed:", err));
 
 */

export function createPollingAction<TInput, TResult>(
  mutationFn: (data: TInput) => Promise<TResult>,
  config: PollingConfig<TResult>
) {
  const base = createAction(mutationFn);
  const isPolling = signal(false);

  const execute = action(async (data: TInput) => {
    isPolling.set(true);
    let attempts = 0;
    const max = config.maxAttempts ?? 20;

    const poll = async (): Promise<TResult> => {
      attempts++;
      const result = await base.execute(data);

      // If condition met or max attempts reached, stop
      if (config.isFinal(result) || attempts >= max) {
        isPolling.set(false);
        return result;
      }

      // Wait and try again
      await new Promise(res => setTimeout(res, config.interval ?? 3000));
      return poll();
    };

    return poll();
  });

  return { 
    ...base, 
    execute, 
    isPolling 
  };
}