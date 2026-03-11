//The Bridge

import { useSyncExternalStore, useEffect } from "react";
import { Signal, Computed, Effect } from "../core/signals";
import { ReadOnlySignal } from "../core/action";

type AnySignal<T> = Signal<T> | Computed<T> | ReadOnlySignal<T>;

/**
 *
 * @param source
 * @returns
 * useSignal Hook
 * This hook allows React components to subscribe to changes in a Signal or Computed value, ensuring that the component re-renders whenever the underlying reactive data changes. It uses `useSyncExternalStore` to manage subscriptions and updates efficiently, providing a seamless integration between the reactive system and React's rendering lifecycle.
 * Example Usage:
 * const count = signal(0);
 * const countValue = useSignal(count);
 * In this example, the component will re-render whenever the `count` signal changes, allowing you to use reactive data directly within your React components without needing to manage subscriptions manually.
 *
 * Note: The `useSignal` hook is designed to work with any reactive source that implements the subscribe and peek methods, making it flexible for various use cases within the reactive system.
 */
export function useSignal<T>(source: AnySignal<T>): T {
  return useSyncExternalStore(
    (cb) => {
      const unsubscribe = source.subscribe(cb);
      return () => unsubscribe();
    },
    () => source.peek(),
    () => source.peek(),
  );
}

export function useSignalEffect(fn: () => void | (() => void)) {
  useEffect(() => {
    const eff = new Effect(fn);
    return () => eff.dispose();
  }, []);
}
