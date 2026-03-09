import { Computed, Signal, signal } from "../core/signals";

// --- GLOBAL REGISTRIES ---
const resourceRegistry = new Set<{ destroy: () => void }>();
const resourceCache = new Map<string, { data: any; timestamp: number }>();
const inFlightRequests = new Map<string, Promise<any>>();
const tagRegistry = new Map<string, Set<any>>();
const DEFAULT_TTL = 5 * 60 * 1000;

const read = <T>(s: any): T => {
  if (s && typeof s === "object" && typeof s.get === "function") {
    return s.get();
  }
  return s;
};

/** * Pulse V5 Standard Engine
 */
export function resource<T>(config: {
  fetch: (signal: AbortSignal) => Promise<T>;
  enabled?: boolean | Computed<boolean> |Signal<boolean>;
  cacheKey?: string;
  retryCount?: number;
  tags?: string[];
  on?: any[];
  ttl?: number;
}) {
  const _data = signal<T | null>(null);
  const _loading = signal(false);
  const _isStale = signal(false);
  const _error = signal<any>(null);

  const unsubs: Array<() => void> = [];
  let abortController: AbortController | null = null;

  const fetchWithRetry = async (
    signal: AbortSignal,
    attempt = 0,
  ): Promise<T> => {
    try {
      return await config.fetch(signal);
    } catch (err: any) {
      if (err.name !== "AbortError" && attempt < (config.retryCount ?? 3)) {
        const delay = 1000 * Math.pow(2, attempt);
        await new Promise((res) => setTimeout(res, delay));
        return fetchWithRetry(signal, attempt + 1);
      }
      throw err;
    }
  };

  const refetch = async () => {
    // SOLUTION: Lazy Gating - Don't fetch if disabled (e.g., Modal is closed)
    if (config.enabled && !read<boolean>(config.enabled)) return;

    // ... (Standard V4 Cache & Deduplication Logic) ...

    const now = Date.now();
    const cached = config.cacheKey ? resourceCache.get(config.cacheKey) : null;
    const isExpired = cached
      ? now - cached.timestamp > (config.ttl ?? DEFAULT_TTL)
      : true;

    // 1. STALE-WHILE-REVALIDATE
    if (cached) {
      _data.set(cached.data);
      if (!isExpired) return;
      _isStale.set(true);
    }

    // 2. DEDUPLICATION
    if (config.cacheKey && inFlightRequests.has(config.cacheKey)) {
      _data.set(await inFlightRequests.get(config.cacheKey));
      return;
    }

    if (abortController) abortController.abort();
    abortController = new AbortController();

    const flight = (async () => {
      _loading.set(true);
      try {
        const result = await fetchWithRetry(abortController!.signal);
        _data.set(result);
        if (config.cacheKey) {
          resourceCache.set(config.cacheKey, {
            data: result,
            timestamp: Date.now(),
          });
        }
        _data.set(result);
        return result;
      } catch (err: any) {
        if (err.name !== "AbortError") {
          _error.set(err);
          _loading.set(false);
          _isStale.set(false);
        }
      } finally {
        if (config.cacheKey) inFlightRequests.delete(config.cacheKey);
        _loading.set(false);
        _isStale.set(false);
      }
    })();

    if (config.cacheKey) inFlightRequests.set(config.cacheKey, flight);
  };
  // --- SUBSCRIPTION MANAGEMENT ---
  const setupSubscriptions = () => {
    // Listen to dependencies
    if (config.on) {
      config.on.forEach((dep) => unsubs.push(dep.subscribe(() => refetch())));
    }
    // Listen to enabled gate

    if (config.enabled && typeof config.enabled !== "boolean") {
      const unsub = config.enabled.subscribe(() => {
        // Since nabd subscribe doesn't always pass the value, read it manually
        if (read<boolean>(config.enabled) && !_data.get()) {
          refetch();
        }
      });
      if (unsub) unsubs.push(unsub);
    }
  };

  const destroy = () => {
    unsubs.forEach((unsub) => unsub());
    if (abortController) abortController.abort();
    resourceRegistry.delete(instance);
    console.log(`[Pulse]: Destroyed ${config.cacheKey || "resource"}`);
  };

  const instance = {
    data: _data,
    loading: _loading,
    isStale: _isStale,
    error: _error,
    refetch,
    destroy,
  };

  // Register globally for mass-cleanup (Logout)
  resourceRegistry.add(instance);

  setupSubscriptions();
  refetch(); // Initial check

  return instance;
}
/** * MASS CLEANUP: The "Nuclear Option" for Logout
 */
export const pulseGlobalReset = () => {
  // 1. Unsubscribe and Abort ALL active resources
  resourceRegistry.forEach((res) => res.destroy());
  tagRegistry.clear();

  // 2. Clear the Map cache
  resourceCache.clear();
  // 3. Clear the In-flight promise map
  inFlightRequests.clear();
  console.log("[Pulse]: System-wide reset completed.");
};

export function invalidate(tag: string) {
  const subscribers = tagRegistry.get(tag);
  if (subscribers) {
    subscribers.forEach((refetch) => refetch());
  }
}
