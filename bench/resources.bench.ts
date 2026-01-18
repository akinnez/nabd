import { run, bench, group } from 'mitata';
import { resource } from '../src/handlers/resources';


// 2. Propagation Performance (The "Pulse" travel time)
group('Dependency Chains', () => {
  bench('Deep Chain (Level 10)', () => {
   const mockFetcher = new Promise(()=> []);
    const res = resource({fetch:()=> mockFetcher});
    
    res.data
  });
});

run();