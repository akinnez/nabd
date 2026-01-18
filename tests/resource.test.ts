import { describe, it, expect, vi } from 'vitest';
import { resource } from '../src/handlers/resources';

describe('Resource Handler', () => {
  it('should handle async lifecycle', async () => {
    const mockFetcher = vi.fn().mockResolvedValue('data');
    const res = resource({fetch: mockFetcher});

    expect(res.loading.get()).toBe(true);
    
    // Wait for the microtask queue to clear (the promise to resolve)
    await vi.waitFor(() => expect(res.loading.get()).toBe(false));

    expect(res.data.get()).toBe('data');
    expect(res.error.get()).toBe(null);
  });

  it('should handle errors', async () => {
    const mockFetcher = vi.fn().mockRejectedValue(new Error('Fail'));
    const res = resource({fetch: mockFetcher});

    await vi.waitFor(() => expect(res.loading.get()).toBe(false));

    expect(res.data.get()).toBe(null);
    expect(res.error.get()).toBeInstanceOf(Error);
  });

  
});