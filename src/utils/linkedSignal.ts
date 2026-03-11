import { effect, signal, Signal } from "../core/signals";


/**
 * Creates a signal that is linked to the value of a reactive source.
 * Whenever the source changes, the linked signal will automatically update to reflect the new value.
 * This is useful for creating derived signals that depend on other reactive data without needing to manually manage subscriptions.
 * 
 * Example Usage:
 * const count = signal(0); 
 * const linkedCount = linkedSignal(() => count.get() * 2); // linkedCount will always be double the value of count
 * count.set(1); 
 * console.log(linkedCount.get()); // Outputs: 2
 * 
 * @param source 
 * @returns 
 */

export function linkedSignal<T>(source: () => T): Signal<T> {
  // Initialize with the current source value
  const s = signal(source());

  // Whenever the source changes, reset the local value
  effect(() => {
    const newValue = source();
    s.set(newValue);
  });

  return s;
}