import { describe, it, expect, vi } from 'vitest';
import { signal, computed, effect, batch } from '../src/core/signals';

describe('Signals Core', () => {
  it('should hold a value and update', () => {
    const count = signal(0);
    expect(count.get()).toBe(0);
    count.set(1);
    expect(count.get()).toBe(1);
  });

  it('should compute derived values', () => {
    const count = signal(2);
    const double = computed(() =>  count.get() * 2);
    // console.log(double.get());
    
    expect(double.get()).toBe(4);
    
    count.set(5);
    expect(double.get()).toBe(10);
  });

  it('should only run effects when dependencies change', () => {
    const count = signal(0);
    const dummy = signal(0);
    const spy = vi.fn();
    
    effect(() => {
      spy();
      count.get(); // only track count
    });

    expect(spy).toHaveBeenCalledTimes(1);
    
    dummy.set(1); // should NOT trigger effect
    expect(spy).toHaveBeenCalledTimes(1);
    
    count.set(1); // SHOULD trigger effect
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should batch multiple updates', () => {
    const count = signal(0);
    const spy = vi.fn();
    
    effect(() => {
      spy();
      count.get();
    });

    batch(() => {
      count.set(1);
      count.set(2);
      count.set(3);
    });

    // Despite 3 sets, the effect should only run once after the batch
    expect(spy).toHaveBeenCalledTimes(2); // Initial + 1 batch update
    expect(count.get()).toBe(3);
  });
  it('should dispose effects and stop tracking', () => {
  const count = signal(0);
  const spy = vi.fn();
  const eff = effect(() => {
    spy();
    count.get();
  });

  eff.dispose();
  count.set(1);

  // Should still be 1 from the initial run, and never called again
  expect(spy).toHaveBeenCalledTimes(1);
});
});