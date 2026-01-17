//The Shield

import { Signal, Computed, batch } from './signals';

export class ReadOnlySignal<T> {
  constructor(protected ref: Signal<T> | Computed<T>) {}
  get() { return this.ref.get(); }
  peek() { return this.ref.peek(); }
  subscribe(cb: () => void) { return this.ref.subscribe(cb); }
}

export const asReadonly = <T>(s: Signal<T> | Computed<T>) => new ReadOnlySignal(s);

export function action<T extends (...args: any[]) => any>(fn: T): T {
  return ((...args: any[]) => {
    let res;
    batch(() => { res = fn(...args); });
    return res;
  }) as T;
}

export function untracked<T>(fn: () => T): T {
  const prev = (globalThis as any).__activeConsumer;
  (globalThis as any).__activeConsumer = null;
  const res = fn();
  (globalThis as any).__activeConsumer = prev;
  return res;
}