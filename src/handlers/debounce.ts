import { Computed, effect, Signal, signal } from "../core/signals";

/**
 * 
 * @param source 
 * @param delay 
 * @returns 
 * 
 * Debounce Signal
 * This utility creates a new Signal that updates its value only after a specified delay has passed since the last change to the source signal. It's particularly useful for scenarios like search input, where you want to wait for the user to stop typing before triggering an expensive operation (e.g., API call).
 * 
 * Example Usage:
 * const searchTerm = signal("");   
 * const debouncedSearchTerm = debounceSignal(searchTerm, 300); // Debounce with 300ms delay
 * effect(() => {
 *   console.log("Debounced Search Term:", debouncedSearchTerm.get());
 * });
 * In this example, the effect will only log the search term after the user has stopped typing for 300 milliseconds, preventing excessive logging and API calls while the user is actively entering text.
 * 
 * usage with resource:
 * const searchTerm = signal("");   
 * const debouncedSearchTerm = debounceSignal(searchTerm, 300);
 * const searchResults = resource({
 *   fetch: (signal) => fetch(`/api/search?q=${debouncedSearchTerm.get()}`, { signal }).then(res => res.json()),
 *   enabled: computed(() => debouncedSearchTerm.get().length > 0) // Only fetch when there's a search term
 * });
 * In this example, the resource will only fetch search results when the debounced search term is not empty, ensuring that we don't make unnecessary API calls when the user clears the input or hasn't entered anything yet.
 */


export function debounceSignal<T>(source: Signal<T> | Computed<T>, delay: number): Signal<T> {
  const debounced = signal(source.peek());
  let timeout: any;

  effect(() => {
    const val = source.get();
    clearTimeout(timeout);
    timeout = setTimeout(() => debounced.set(val), delay);
  });

  return debounced;
}


