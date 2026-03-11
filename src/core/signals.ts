//The Heart

type Subscriber = { notify: () => void; dependencies: Set<any> };
let activeConsumer: Subscriber | null = null;
let isBatching = false;
const pendingNotifications = new Set<Subscriber>();

export class Signal<T> {
  private subscribers = new Set<Subscriber>();
  constructor(private value: T) {}
  get(): T {
    if (activeConsumer) {
      activeConsumer.dependencies.add(this);
      this.subscribers.add(activeConsumer);
    }
    return this.value;
  }
  peek(): T { return this.value; }
  set(newValue: T) {
    if (Object.is(this.value, newValue)) return;
    this.value = newValue;
    if (isBatching) this.subscribers.forEach(sub => pendingNotifications.add(sub));
    else [...this.subscribers].forEach(sub => sub.notify());
  }
  update(fn: (val: T) => T) { this.set(fn(this.value)); }
  subscribe(cb: () => void): () => void {
    const sub = { notify: cb, dependencies: new Set<Signal<any>>([this]) };
    this.subscribers.add(sub);
    return () => this.subscribers.delete(sub);
  }
  _unsubscribe(sub: Subscriber) { this.subscribers.delete(sub); }
}

export class Computed<T> {
  private cachedValue!: T;
  private dirty = true;
  private signal: Signal<T>;
  private subscriber: Subscriber;

  constructor(private getter: () => T) {
    // We initialize the signal with the first computation
    this.signal = new Signal<T>(undefined as any);
    
    // Create a subscriber that marks this computed as dirty 
    // and notifies its own dependents
    this.subscriber = {
      dependencies: new Set(),
      notify: () => {
        this.dirty = true;
        this.signal.set(this.get()); // Re-evaluate and propagate
      },
    };
  }

  get(): T {
    if (this.dirty) {
      // Clear old dependencies before re-tracking
      this.subscriber.dependencies.forEach(dep => dep._unsubscribe(this.subscriber));
      this.subscriber.dependencies.clear();

      const prev = activeConsumer;
      activeConsumer = this.subscriber;
      try {
        this.cachedValue = this.getter();
        // Update the internal signal without triggering an infinite loop
        (this.signal as any).value = this.cachedValue; 
      } finally {
        activeConsumer = prev;
      }
      this.dirty = false;
    }

    // Register the internal signal with whatever is currently reading this Computed
    return this.signal.get();
  }

  peek() {
    return this.get();
  }

  subscribe(cb: () => void) {
    return this.signal.subscribe(cb);
  }
}


export class Effect {
  private subscriber: Subscriber;
  private cleanup?: () => void;
  constructor(private fn: () => void | (() => void)) {
    this.subscriber = { dependencies: new Set(), notify: () => this.run() };
    this.run();
  }
  private run() {
    this.dispose();
    const prev = activeConsumer;
    activeConsumer = this.subscriber;
    try { this.cleanup = this.fn() || undefined; } 
    finally { activeConsumer = prev; }
  }
  dispose() {
    if (this.cleanup) this.cleanup();
    this.subscriber.dependencies.forEach(s => s._unsubscribe(this.subscriber));
    this.subscriber.dependencies.clear();
  }
}


/**
signal: Creates a reactive value that can be read and updated. When the value changes, all dependent Computed and Effect instances are automatically re-evaluated.
computed: Defines a value that is derived from other signals. It automatically tracks its dependencies and updates when any of them change.

Example Usage:
const count = signal(0);
 */
export const signal = <T>(v: T) => new Signal(v);
/**
computed: Defines a value that is derived from other signals. It automatically tracks its dependencies and updates when any of them change.
Example Usage:
const count = signal(2);
const double = computed(() =>  count.get() * 2);
 */
export const computed = <T>(fn: () => T) => new Computed(fn);
/**effect: Runs a side-effectful function that automatically re-runs whenever any of the signals it depends on change. It also supports cleanup functions for managing resources.
 * Example Usage:
effect(() => {
  console.log("Count changed:", count.get());
});
 */
export const effect = (fn: () => void | (() => void)) => new Effect(fn);
/**batch: Allows multiple signal updates to be grouped together, ensuring that dependent computations only run once after all updates are applied, improving performance in scenarios with multiple changes.
 * Example Usage:
batch(() => {
  count.set(1);
  double.set(2);
});
 */
export const batch = (fn: () => void) => {
  isBatching = true;
  try { fn(); } 
  finally { isBatching = false; pendingNotifications.forEach(s => s.notify()); pendingNotifications.clear(); }
};