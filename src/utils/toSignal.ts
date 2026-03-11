import { ReadOnlySignal } from "../core/action";
import { computed, Signal, signal } from "../core/signals";
import { AnySignal } from "../types/utils";


/**
 * Normalizes a value into a Signal.
 * If it's already a signal, it returns it.
 * If it's a function, it turns it into a Computed.
 * If it's a primitive, it wraps it in a Signal.
 * 
 * Example Usage:
 * const count = toSignal(0); // Creates a signal with initial value 0
 * const double = toSignal(() => count.get() * 2); // Creates a computed that depends on count
 * const existingSignal = signal(5); // Creates a signal with initial value 5   
 * const normalizedSignal = toSignal(existingSignal); // Returns the existing signal as-is
 * 
 */


/**
 * Overload 1: If it's already a signal, return it as-is.
 */
export function toSignal<T>(value: Signal<T>): Signal<T>;
export function toSignal<T>(value: ReadOnlySignal<T>): ReadOnlySignal<T>;

/**
 * Overload 2: If it's a getter function, return a ReadonlySignal (Computed).
 */
export function toSignal<T>(value: () => T): ReadOnlySignal<T>;

/**
 * Overload 3: If it's a primitive value, return a Writable Signal.
 */
export function toSignal<T>(value: T): Signal<T>;
export function toSignal<T>(value: T | (() => T) | AnySignal<T>): any {
  // 1. If it's already a signal, return it as-is
  if (typeof (value as any)?.subscribe === 'function') {
    return value as AnySignal<T>;
  }

  // 2. If it's a function, treat it as a computed dependency
  if (typeof value === 'function') {
    return computed(value as () => T);
  }

  // 3. Otherwise, wrap the primitive in a signal
  return signal(value);
}