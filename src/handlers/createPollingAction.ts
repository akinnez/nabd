import { action } from "../core/action";
import { signal } from "../core/signals";
import { createAction } from "./createAction";

interface PollingConfig<TResult> {
  interval?: number;     // How often to poll (default 3s)
  maxAttempts?: number;  // Safety limit
  isFinal: (res: TResult) => boolean; // Logic to stop polling
}

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