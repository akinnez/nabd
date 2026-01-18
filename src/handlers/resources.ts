import { signal } from "../core/signals";

// Global registry of which resources listen to which tags
const tagRegistry = new Map<string, Set<any>>();

export function resource<T>(config: {
  fetch: () => Promise<T>,
  tags?: string[]
}) {
  const _data = signal<T | null>(null);
  const _loading = signal(false);
  const _error = signal<any>(null);

  const refetch = async () => {
    _loading.set(true);
    try {
      const result = await config.fetch();
      _data.set(result); 
    } 
    catch (e) { _error.set(e); }
    finally {
      _loading.set(false);
    }
  };

  // Register this resource for the provided tags
  config.tags?.forEach(tag => {
    if (!tagRegistry.has(tag)) tagRegistry.set(tag, new Set());
    tagRegistry.get(tag)!.add(refetch);
  });

  // Initial fetch
  refetch();

  return { data: _data, loading: _loading,error:_error, refetch };
}

/**
 * The "Pulse" that triggers the chain reaction
 */
export function invalidate(tag: string) {
  const subscribers = tagRegistry.get(tag);
  if (subscribers) {
    subscribers.forEach(refetch => refetch());
  }
}