import { PulseMiddleware } from "../types/utils";


export const telemetryMiddleware = (options?: { 
  onLog?: (data: { endpoint: string; latency: number; status: 'success' | 'error' }) => void 
}): PulseMiddleware<
  { endpoint: string; latency: number; status: 'success' | 'error' },
  any
> => {
  // Store the start time in a closure-scoped map if needed, 
  // but for simple latency, we can use a local variable per execution.
  let startTime: number;

  return {
    onBefore: () => {
      startTime = performance.now();
    },
    onSuccess: (_, data: any) => {
      const latency = performance.now() - startTime;
      const endpoint = data?.url || "unknown-endpoint";
      
      if (options?.onLog) {
        options.onLog({ endpoint, latency, status: 'success' });
      } else {
        console.log(`📊 [Telemetry] ${endpoint} took ${latency.toFixed(2)}ms`);
      }
    },
    onError: (_, data: any) => {
      const latency = performance.now() - startTime;
      const endpoint = data?.url || "unknown-endpoint";

      if (options?.onLog) {
        options.onLog({ endpoint, latency, status: 'error' });
      } else {
        console.error(`📊 [Telemetry] ${endpoint} FAILED after ${latency.toFixed(2)}ms`);
      }
    }
  };
};