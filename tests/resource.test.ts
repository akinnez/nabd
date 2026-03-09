import { describe, it, expect, vi, beforeEach } from "vitest";
import { resource, pulseGlobalReset } from "../src/handlers/resources";
import { signal } from "../src/core/signals";

describe("Pulse V5 Resource Engine", () => {
  
  beforeEach(() => {
    // Crucial: Wipe the system between tests so cache/listeners don't leak
    pulseGlobalReset();
  });

  it("should handle the happy path (Success)", async () => {
    const mockFetcher = vi.fn().mockResolvedValue("success_payload");
    const res = resource({ fetch: mockFetcher });

    expect(res.loading.get()).toBe(true);
    
    await vi.waitFor(() => {
      expect(res.loading.get()).toBe(false);
      expect(res.data.get()).toBe("success_payload");
    });
    expect(res.error.get()).toBe(null);
  });

  it("should handle the error path (Failure)", async () => {
    // 1. Setup a failing fetcher
    const errorMsg = "PGP Decryption Failed";
    const mockFetcher = vi.fn().mockRejectedValue(new Error(errorMsg));

    // 2. Disable retries for this test to make it fast
    const res = resource({ 
      fetch: mockFetcher, 
      retryCount: 0 
    });

    // 3. Wait for loading to stop
    await vi.waitFor(() => expect(res.loading.get()).toBe(false));

    // 4. Check error state
    expect(res.data.get()).toBe(null);
    expect(res.error.get()).toBeDefined();
    expect(res.error.get()?.message).toBe(errorMsg);
  });

  it("should respect the 'enabled' gate (Lazy Loading)", async () => {
    const isEnabled = signal(false);
    const mockFetcher = vi.fn().mockResolvedValue("data");
    const res = resource({ fetch: mockFetcher, enabled: isEnabled});

    // Should stay idle
    await new Promise(r => setTimeout(r, 50));
    expect(mockFetcher).not.toHaveBeenCalled();

    // Flip the switch
    isEnabled.set(true);

    expect(mockFetcher).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(res.data.get()).toBe("data"));

  });

  it("should deduplicate simultaneous requests", async () => {
    const mockFetcher = vi.fn().mockImplementation(() => 
      new Promise(res => setTimeout(() => res("done"), 50))
    );

    // Call two resources with the same key at the same time
    const res1 = resource({ fetch: mockFetcher, cacheKey: "dup-test" });
    const res2 = resource({ fetch: mockFetcher, cacheKey: "dup-test" });

    await vi.waitFor(() => expect(res1.loading.get()).toBe(false));

    // Proof: Fetcher only ran ONCE even though we had two resources
    expect(mockFetcher).toHaveBeenCalledTimes(1);
    expect(res1.data.get()).toBe("done");
    expect(res2.data.get()).toBe("done");
  });
});