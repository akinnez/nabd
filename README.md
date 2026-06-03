# 🚀 Nabd (v1.1.0) Core

## The Heartbeat of High-Performance Fintech UIs.

Nabd is a lightweight, precision-engineered reactivity engine built for developers who can't afford data desync, slow interfaces, or security leaks. Designed with a "security-first" mindset, it provides the primitives needed to build complex financial dashboards with predictable state and bank-grade safety.

# ❓ Why nabd?

In the high-stakes environment of Fintech, generic state management isn't enough. nabd is built to manage the Transaction Lifecycle, not just data variables.

## 🎯 Fine-Grained Precision:

Traditional React state causes "render cascades." Update a single NGN/USD exchange rate, and your entire dashboard re-renders. nabd bypasses this.

## 🛡️ Transactional Integrity:

1. Atomic Action Guards: createAction automatically prevents "Double-Tap" submissions on transfer buttons. No more manual isDisabled state management.
2. Automatic Reversion: Using withReversion, nabd snapshots your state before an API call. If the network fails, it rolls back the UI to the last "server truth" automatically.

## 📡 Smart Resource Sync:

The resource API acts as a Declarative Mirror of your backend.

1. Reactive Dependencies: Use the on array to link a resource to a search query or user ID. It handles the AbortController and race conditions for you.
2. Gated Execution: Use enabled to pause API calls until conditions (like a valid BVN or KYC level) are met.

## 🌍 Real-World Telemetry:

Built for markets with fluctuating network speeds. The integrated Telemetry Middleware lets you monitor how much time is spent on PGP encryption versus actual network latency, giving you the data needed to optimize for every user.

# ✨ Features

1.  Fine-Grained Reactivity: Update specific UI nodes (like a wallet balance) without re-rendering entire component trees.
2.  Bank-Grade Safety: Integrated middleware for PGP encryption, automatic request rollbacks, and atomic action guards.
3.  Reactive Data Fetching: The resource API synchronizes your UI with your backend using declarative dependency tracking.
4.  Developer-First Primitives: Includes linkedSignal for smart forms and toSignal for seamless integration with non-reactive data.
5.  React Ready: Seamless integration with useSignal and useSyncExternalStore.
6.  Type Safe: 100% TypeScript with first-class IDE support.

# 📦 Installation

```Bash

npm install nabd
# or
yarn add nabd
```

# Quick Start Guide

## 1. Global Configuration (main.ts)

Set up your global error handling and security layers once at the root of your app.

```typescript
import { Pulse, telemetryMiddleware } from "nabd";

Pulse.configure({
  middleware: [
    telemetryMiddleware(), // You can also use any telemetry of choice
    {
      onError: (err) => {
        if (err.status === 401) handleLogout();
        toast.error(err.message);
      },
    },
  ],
});
```

## 2. Define Your Store

```typescript
import { resource, signal, computed } from "nabd";

export const currency = signal("NGN");
export const balance = resource({
  on: [currency],
  fetch: (abort) => api.get(`/wallet/balance?ccy=${currency.get()}`, { abort }),
  cacheKey: "user-balance",
});
```

## 3. Create a simple reusable component (React Bridge)

```typescript
import {useSignal, AnySignal  } from "nabd";

interface TextProps {
  signal: AnySignal<string | number>;
  className?: string;
}

/**
 * A fine-grained component that subscribes to a signal.
 * Only THIS component re-renders when the signal changes.
 */
export function Text({ signal, className }: TextProps) {
  const value = useSignal(signal);
  return <span className={className}>{value}</span>;
}
```

## 4. Connect to a React Component

Use the useSignal hook to "peek" into the store. React will handle the subscription and unsubscription automatically.

```typescript
import { Text, useSignal, computed } from 'nabd';
import { Text } from '../your-component';

function Dashboard() {
  // Only re-renders if the whole profile object changes
  const data = useSignal(balance.data);

  return (
    <div>
      {/* Fine-grained: Bypasses component render to update just this span */}
      <h1>Balance: <Text signal={computed(() => `₦${data?.amount}`)} /></h1>
      <button onClick={() => currency.set('USD')}>Switch to USD</button>
    </div>
  );
}
```

# Fintech Patterns: Optimistic Updates

Nabd makes handling failed transactions easy with withReversion.

```typeScript

import { withReversion, action } from 'nabd';

export const sendMoney = action(async (amount: number) => {
  balance.update(n => n - amount); // Update UI immediately

  try {
    await withReversion([balance], async () => {
      await api.post('/transfer', { amount }); // If this fails, balance rolls back!
    });
  } catch (e) {
    showNotification("Transfer failed, balance restored.");
  }
});
```

# 🧬 Core API Reference

## resource(config)

The primary engine for GET requests. It manages its own loading, error, and data states.

### on:

Array of signals to watch for re-fetching.

### enabled:

A gate to pause/resume the resource.

## createAction(fn, config)

The engine for mutations (POST/PATCH/DELETE).

### atomic:

Prevents concurrent execution of the same action.

### withReversion:

Automatically snapshots state to rollback if the API fails.

## linkedSignal(source)

A writable signal that "follows" a source getter but allows manual local overrides—perfect for edit forms.

## toSignal(value)

The "Swiss Army Knife" for reactivity. Converts primitives, functions, or existing signals into a standardized reactive format.

# 📈 Performance Benchmarks

nabd is built for speed. Using mitata, we ensure our signal propagation and resource synchronization are optimized for low-latency environments.

```Bash
npm run bench
```

# Pro-Tips for the Team

## 🟢 DO: Use asReadonly

Always export the readonly version of your signals. This prevents components from doing count.set(999) directly, forcing all state changes to happen through defined Actions.

## 🔴 DON'T: Use Signals for EVERYTHING

If a piece of state is only used inside one small component and never shared (like a "isDropdownOpen" toggle), standard useState is perfectly fine. Use Signals for shared state or high-frequency updates.

## 🟡 WATCH OUT: Destructuring

Do not destructure signals in your component body.

```typescript
❌ const { get } = count; (Tracking might break)

✅ const value = useSignal(count);
```

## 🛠️ Debugging with "Effects"

If you're wondering why a value isn't updating, add a temporary effect in your store file. It will log every change to the console:

```typeScript

effect(() => {
  console.log("[DEBUG] Count changed to:", count.get());
});
```
