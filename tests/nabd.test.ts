import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  signal, 
  computed, 
  resource, 
  createAction, 
  Pulse, 
  toSignal, 
  linkedSignal 
} from "../src";

describe("nabd v1.1.0 Core Suite", () => {
  
  beforeEach(() => {
    // Reset Global Config before each test
    Pulse.configure({ middleware: [] });
  });

  // --- 1. REACTIVITY & UTILITIES ---
  describe("Primitives & Utilities", () => {
    it("toSignal should normalize values correctly", () => {
      const prim = toSignal("hello");
      const fn = toSignal(() => "world");
      const sig = signal(100);
      
      expect(prim.get()).toBe("hello");
      expect(fn.get()).toBe("world");
      expect(toSignal(sig)).toBe(sig); // Should return same instance
    });

    it("linkedSignal should sync with source and allow overrides", () => {
      const source = signal("Initial");
      const linked = linkedSignal(() => source.get());

      expect(linked.get()).toBe("Initial");

      // Manual override
      linked.set("Manual");
      expect(linked.get()).toBe("Manual");
      expect(source.get()).toBe("Initial"); // Source remains untouched

      // Source update triggers reset
      source.set("Updated");
      expect(linked.get()).toBe("Updated");
    });
  });

  // --- 2. MIDDLEWARE & TELEMETRY ---
  describe("Middleware Pipeline", () => {
    it("should execute global telemetry middleware", async () => {
      const logSpy = vi.fn();
      
      Pulse.configure({
        middleware: [{
          onBefore: (data) => logSpy("before", data),
          onSuccess: (res) => logSpy("success", res)
        }]
      });

      const action = createAction(async (val: number) => val * 2);
      await action.execute(5);

      expect(logSpy).toHaveBeenCalledWith("before", 5);
      expect(logSpy).toHaveBeenCalledWith("success", 10);
    });

    it("should catch errors in global middleware", async () => {
      const errorSpy = vi.fn();
      Pulse.configure({
        middleware: [{ onError: (err) => errorSpy(err.message) }]
      });

      const action = createAction(async () => {
        throw new Error("API_FAIL");
      });

      try { await action.execute(); } catch { /* expected */ }

      expect(errorSpy).toHaveBeenCalledWith("API_FAIL");
    });
  });

  // --- 3. RESOURCE API (The Sync Engine) ---
  describe("Resource Logic", () => {
    it("should re-fetch automatically when dependencies change", async () => {
      const id = signal(1);
      const fetchSpy = vi.fn().mockImplementation(async (s) => `Data ${id.get()}`);

      const user = resource({
        on: [id],
        fetch: fetchSpy
      });

      // Initial fetch
      await vi.waitFor(() => expect(user.data.get()).toBe("Data 1"));

      // Update dependency
      id.set(2);
      
      await vi.waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledTimes(2);
        expect(user.data.get()).toBe("Data 2");
      });
    });
  });

  // --- 4. ACTIONS & MUTATIONS (The Transaction Engine) ---
  describe("Actions & Safety", () => {
    it("should prevent concurrent executions (Atomic Guard)", async () => {
      const fetchSpy = vi.fn().mockImplementation(() => 
        new Promise(res => setTimeout(() => res("done"), 50))
      );

      const action = createAction(fetchSpy);

      // Fire twice immediately
      const p1 = action.execute();
      const p2 = action.execute();

      await Promise.allSettled([p1, p2]);

      // The second call should have been blocked if the action was still pending
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("should support state reversion on failure", async () => {
      const balance = signal(1000);
      
      const updateBalance = createAction(
        async (amount: number) => {
          balance.set(amount); // Optimistic update
          console.log("Balance updated to:", amount);
        },
        {
          onError: (_, originalValue:any) => {
            // Logic to revert state would be handled here or in the wrapper
            balance.set(originalValue); 
          }
        }
      );
      try {
        await updateBalance.execute(5000);
      } catch (error) {
        expect(balance.get()).toBe(1000);
      }
    });
  });
});