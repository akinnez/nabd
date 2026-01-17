//The Bridge

import { useSyncExternalStore, useEffect } from "react";
import { Signal, Computed, Effect } from "../core/signals";
import { ReadOnlySignal } from "../core/action";

type AnySignal<T> = Signal<T> | Computed<T> | ReadOnlySignal<T>;

export function useSignal<T>(source: AnySignal<T>): T {
  return useSyncExternalStore(
    (cb) => source.subscribe(cb),
    () => source.peek(),
    () => source.peek()
  );
}

export function useSignalEffect(fn: () => void | (() => void)) {
  useEffect(() => {
    const eff = new Effect(fn);
    return () => eff.dispose();
  }, []);
}
