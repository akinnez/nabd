import { Computed, Signal, signal } from "../core/signals";
import { AnySignal, PulseMiddleware } from "../types/utils";
import { Pulse } from "../utils/pulse";

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
/**
 *
 * @param config
 * @returns
 *
 * RESOURCE API: A powerful, flexible data-fetching utility with built-in caching, deduplication, retry logic, and tag-based invalidation. Designed for complex applications with dynamic data needs.
 * Key Features:
 * - Caching with TTL: Automatically cache results based on a cacheKey and invalidate after a specified time.
 * - Deduplication: Prevent multiple simultaneous fetches for the same resource.
 * - Retry Logic: Configurable retry attempts with exponential backoff for transient errors.
 * - Tag-based Invalidation: Group resources by tags and invalidate them together (e.g., after a mutation).
 * - Lazy Gating: Optionally delay fetching until certain conditions are met (e.g., a modal is open).
 * - Global Reset: A single function to clear all resources, useful for logout scenarios.
 *
 * Example Usage:
 * const userResource = resource({
 *   fetch: (signal) => fetch("/api/user", { signal }).then(res => res.json()),
 *  cacheKey: "current_user",
 *  tags: ["user_profile"],
 *  retryCount: 2,
 *  ttl: 10 * 60 * 1000, // 10 minutes
 * });
 */

export function resource<T>(config: {
  /**
   * fetch function that receives an AbortSignal for cancellation. Should return a Promise that resolves with the data.
   * Example:
   * fetch: (signal) => fetch("/api/data", { signal }).then(res => res.json())
   * 
   * @param signal 
   * @returns 
   */
  fetch: (signal: AbortSignal) => Promise<T>;
  /**
   * [Optional] gating mechanism to control when the resource should fetch. Can be a boolean, a Signal, or a Computed. Useful for scenarios like modals or conditional data fetching.
   * Example:
   * enabled: computed(() => isModalOpen.get()) // Only fetch when modal is open
   */
  enabled?: boolean | Computed<boolean> | Signal<boolean>;
  /**
   * [Optional] key for caching the resource. If provided, the resource will cache its result and serve it for subsequent requests until the TTL expires. Can be a string or a Signal/Computed that resolves to a string.
   */
  cacheKey?: string | Computed<string> | Signal<string>;
  /**
   * [Optional] number of retry attempts for failed fetches. Implements exponential backoff between attempts. Default is 3.
   * Example:
   * retryCount: 5 // Will retry up to 5 times on failure
   */
  retryCount?: number;

/**
 * [Optional] tags for grouping resources. Useful for invalidation after mutations. For example, if you have a resource that fetches user data, you might tag it with "user_profile". Then, after a mutation that updates the user profile, you can call invalidate("user_profile") to automatically refetch all resources with that tag.
 * Example:
 * tags: ["user_profile", "dashboard_data"] // This resource belongs to both "user_profile" and "dashboard_data" groups
 * invalidate("user_profile") would refetch this resource, while invalidate("dashboard_data") would also refetch it. This allows for flexible and efficient cache management across related resources.
 * 
 * Note: If you use tags, make sure to call invalidate with the appropriate tag after performing mutations that affect the data. This ensures that your UI stays in sync with the latest state without manual refetching.
 */
  tags?: string[];
  /**
   * [Optional] dependencies that trigger a refetch when they change. Can be an array of Signals or Computeds. Useful for dynamic resources that depend on other reactive values.
   * Example:
   * on: [userIdSignal] // Refetches whenever userIdSignal changes
   * This allows you to create resources that automatically update based on changes in other parts of your application, ensuring that your data stays fresh and relevant without manual intervention.
   * Note: Be cautious when using dependencies to avoid creating circular references or excessive refetching. Always ensure that the dependencies are necessary for the resource's data and that they don't lead to unintended consequences in your application's reactivity.
   */
  on?: AnySignal<T>[];
  /**
   * [Optional] Time-to-live for cached data in milliseconds. After this time, the cached data will be considered stale and a new fetch will be triggered on the next access. Default is 5 minutes (300,000 ms).
   * Example:
   * ttl: 2 * 60 * 1000 // Cache expires after 2 minutes
   * This allows you to control how long the cached data should be considered valid, ensuring that your application doesn't serve stale data for too long while still benefiting from caching for frequently accessed resources.
   * 
   */
  ttl?: number;
  /**
   * [Optional] Middleware for this specific resource instance. This allows you to apply transformations or side effects to the fetch process without affecting global middleware. For example, you could use onBefore to modify the request parameters, onSuccess to log the result, or onError to send error reports.
   * Example:
   * options: { 
   * middleware: [
   *  {
   *   onBefore: (data) => { console.log("Fetching resource with data:", data); },
   *   onSuccess: (result) => { console.log("Resource fetched successfully:", result); }
   * }
   * ] }
   * This would log messages before and after the fetch operation for this specific resource, without affecting other resources that don't use this middleware. This is particularly useful for adding instance-specific logging, error handling, or data transformations while keeping the global middleware clean and reusable across multiple resources.
   */
  options?: { middleware?: PulseMiddleware<any, any>[] }
}): {
  data: Signal<T | null>;
  loading: Signal<boolean>;
  isStale: Signal<boolean>;
  error: Signal<any>;
  refetch: () => Promise<void>;
  destroy: () => void;
} {
  const _data = signal<T | null>(null);
  const _loading = signal(false);
  const _isStale = signal(false);
  const _error = signal<any>(null);

  const key = read<string>(config.cacheKey);
  const unsubs: Array<() => void> = [];
  let abortController: AbortController | null = null;

  const globalMiddleware = Pulse.getConfig().middleware;
  const localMiddleware = config.options?.middleware || [];
  const allMiddleware = [...globalMiddleware, ...localMiddleware];

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

  const registerTags = () => {
    if (!config.tags) return;

    config.tags.forEach((tag) => {
      if (!tagRegistry.has(tag)) {
        tagRegistry.set(tag, new Set());
      }

      tagRegistry.get(tag)!.add(refetch);
    });
  };

  const refetch = async () => {
    // SOLUTION: Lazy Gating - Don't fetch if disabled (e.g., Modal is closed)
    if (config.enabled && !read<boolean>(config.enabled)) return;

    const now = Date.now();
    const cached = config.cacheKey ? resourceCache.get(key) : null;
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
    if (key && inFlightRequests.has(key)) {
      _data.set(await inFlightRequests.get(key));
      return;
    }

    if (abortController) abortController.abort();
    abortController = new AbortController();

    const flight = (async () => {
      _loading.set(true);

      allMiddleware.forEach(m => m.onBefore?.(null));

      try {
        const result = await fetchWithRetry(abortController!.signal);
        allMiddleware.forEach(m => m.onSuccess?.(result, null));

        _data.set(result);
        if (key) {
          resourceCache.set(key, {
            data: result,
            timestamp: Date.now(),
          });
        }
        _data.set(result);
        return result;
      } catch (err: any) {
        allMiddleware.forEach(m => m.onError?.(err, null));
        if (err.name !== "AbortError") {
          _error.set(err);
          console.error(`[Pulse] Resource fetch failed:`, err);
        }
      } finally {
        if (key) inFlightRequests.delete(key);
        _loading.set(false);
        _isStale.set(false);
      }
    })();

    if (key) inFlightRequests.set(key, flight);
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
    if (config.tags) {
      config.tags.forEach((tag) => {
        const set = tagRegistry.get(tag);
        if (set) {
          set.delete(refetch);
          if (set.size === 0) tagRegistry.delete(tag);
        }
      });
    }
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
  registerTags();
  setupSubscriptions();
  refetch(); // Initial check

  return instance;
}
/** * MASS CLEANUP: The "Nuclear Option" for Logout
 * When a user logs out, we want to ensure all sensitive data is cleared immediately. This function aborts all in-flight requests, clears caches, and resets the entire resource system to a clean slate.
 *
 * Usage: Call pulseGlobalReset() on logout to ensure no stale or sensitive data lingers in memory, and all resources are ready for a fresh start on the next login.
 *
 * Example:
 * function handleLogout() {
 *   pulseGlobalReset();
 *   // ... additional logout logic (e.g., redirect, clear auth tokens) ...
 * }
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

/** * Cache Invalidation by Tag
 * In complex applications, certain actions (like mutations) may require us to invalidate multiple related resources to ensure data consistency. This function allows us to invalidate all resources associated with a specific tag, triggering them to refetch fresh data on the next access.
 *
 * Usage: After performing a mutation that affects certain data (e.g., updating a user profile), call invalidate("user_profile") to automatically refetch all resources tagged with "user_profile", ensuring the UI reflects the latest state without manual intervention.
 *
 * Example: invalidate("user_profile") would refetch all resources tagged with "user_profile"
 */

export function invalidate(tag: string) {
  const subscribers = tagRegistry.get(tag);
  if (subscribers) {
    subscribers.forEach((refetch) => refetch());
  }
}
