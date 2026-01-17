import { run, bench, group } from 'mitata';
import { signal, computed, effect } from '../src/core/signals';

// 1. Raw Set/Get Performance
group('Atomic Operations', () => {
  const s = signal(0);
  
  bench('signal.set', () => {
    s.set(Math.random());
  });

  bench('signal.get', () => {
    s.get();
  });
});

// 2. Propagation Performance (The "Pulse" travel time)
group('Dependency Chains', () => {
  bench('Deep Chain (Level 10)', () => {
    const root = signal(0);
    let current = computed(() => root.get() + 1);
    
    for (let i = 0; i < 9; i++) {
      const prev = current;
      current = computed(() => prev.get() + 1);
    }
    
    root.set(1);
    current.get(); // Trigger the pull
  });
});

run();