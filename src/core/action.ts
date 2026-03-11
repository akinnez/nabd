//The Shield

import { Signal, Computed, batch } from './signals';


export class ReadOnlySignal<T> {
  constructor(protected ref: Signal<T> | Computed<T>) {}
  get() { return this.ref.get(); }
  peek() { return this.ref.peek(); }
  subscribe(cb: () => void) { return this.ref.subscribe(cb); }
}
/**
 * 
 * @param s 
 * @returns 
*
 * Utility to convert a Signal or Computed into a ReadOnlySignal, ensuring that consumers can only read the value without modifying it. This is particularly useful for encapsulating internal state and exposing a safe API to external components, preventing unintended side effects while still allowing reactivity.
  * Example Usage:
  * const count = signal(0);
  * const readonlyCount = asReadonly(count);
  * // readonlyCount.get() will return the current value of count, but cannot be set directly.
 */
export const asReadonly = <T>(s: Signal<T> | Computed<T>) => new ReadOnlySignal(s);

/**
 * 
 * @param fn 
 * @returns 
 * 
 * Action Wrapper
 * In reactive systems, it's often necessary to batch multiple state updates together to prevent unnecessary re-renders and ensure consistency. The `action` function serves as a wrapper that batches all state changes made within the provided function, ensuring that dependent computations and effects are only triggered once after all updates are applied. This is especially beneficial in scenarios like form submissions or complex interactions where multiple signals may be updated in quick succession.
 * Example Usage:
 * const count = signal(0);     
 * const increment = action(() => {
 *  count.set(count.get() + 1);
 *  count.set(count.get() + 1);
 * });  
 * In this example, calling `increment()` will update the `count` signal twice, but any effects or computed values that depend on `count` will only re-run once after both updates are applied, improving performance and ensuring a smoother user experience.
 */

export function action<T extends (...args: any[]) => any>(fn: T): T {
  return ((...args: any[]) => {
    let res;
    batch(() => { res = fn(...args); });
    return res;
  }) as T;
}

/**
 * 
 * @param fn 
 * @returns 
 *
 * untracked: Executes a function without tracking its dependencies, preventing it from causing re-renders when signals change. This is useful for performing side effects or computations that should not trigger updates to the UI, such as logging or non-reactive calculations.
 * Example Usage:
 * const count = signal(0);
 * effect(() => {
 * console.log("Count changed:", count.get());
 * });
 * untracked(() => {
 * console.log("This will not trigger the effect:", count.get());
 * });
 * In this example, the `untracked` function allows us to read the value of `count` without causing the effect to re-run when `count` changes, providing a way to perform operations that should not be reactive.
 */



export function untracked<T>(fn: () => T): T {
  const prev = (globalThis as any).__activeConsumer;
  (globalThis as any).__activeConsumer = null;
  const res = fn();
  (globalThis as any).__activeConsumer = prev;
  return res;
}