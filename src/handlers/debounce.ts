import { Computed, effect, Signal, signal } from "../core/signals";

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


