# 🚀 Nabd Core

A lightweight, high-performance reactivity engine designed for Fintech applications. Built for precision, speed, and safety.

# ✨ Features

1.  Fine-Grained Reactivity: Updates only what changes—no more unnecessary re-renders.
2.  Atomic Transactions: Native action and batch support for consistent state.
3.  Bank-Grade Safety: Integrated withReversion for atomic optimistic UI rollbacks.
4.  React Ready: Seamless integration with useSignal and useSyncExternalStore.
5.  Type Safe: 100% TypeScript with first-class IDE support.

# 📦 Installation

```Bash

npm install nabd
# or
yarn add nabd
```

# Quick Start Guide

1. Create your first "Store"

Instead of putting state inside components, create a dedicated file for your domain logic. This makes the state shareable and easy to test.

```typescript
// stores/counterStore.ts
import { signal, computed, action, asReadonly } from "nabd";

// 1. Private state (cannot be modified outside this file)
const _count = signal(0);

// 2. Public Read-only view
export const count = asReadonly(_count);

// 3. Derived state (Automatic)
export const doubleCount = computed(() => _count.get() * 2);

// 4. Actions (Logic with automatic batching)
export const increment = action(() => {
  _count.update((n) => n + 1);
});

export const reset = action(() => {
  _count.set(0);
});
```

2. Connect to a React Component
   Use the useSignal hook to "peek" into the store. React will handle the subscription and unsubscription automatically.

```typescript
// components/Counter.tsx
"use client"; // Required for Next.js App Router

import { useSignal } from "nabd/react";
import { count, doubleCount, increment } from "../stores/counterStore";

export default function Counter() {
  // Component re-renders ONLY when count changes
  const c = useSignal(count);
  const dc = useSignal(doubleCount);

  return (
    <div className="card">
      <h1>Count: {c}</h1>
      <h2>Double: {dc}</h2>
      <button onClick={increment}>Add +1</button>
    </div>
  );
}
```

3. Handle Async Data (The Resource Pattern)
   For fetching data, use the resource handler. It tracks loading states so you don't have to create three separate signals manually.

```typescript
// stores/userStore.ts
import { resource, signal } from "nabd";

const userId = signal(1);

export const userResource = resource(async () => {
  const response = await fetch(`https://api.example.com/user/${userId.get()}`);
  return response.json();
});

export const nextUser = () => userId.update((id) => id + 1);
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

# Pro-Tips for the Team

🟢 DO: Use asReadonly
Always export the readonly version of your signals. This prevents components from doing count.set(999) directly, forcing all state changes to happen through defined Actions.

🔴 DON'T: Use Signals for EVERYTHING
If a piece of state is only used inside one small component and never shared (like a "isDropdownOpen" toggle), standard useState is perfectly fine. Use Signals for shared state or high-frequency updates.

🟡 WATCH OUT: Destructuring
Do not destructure signals in your component body.

```typescript
❌ const { get } = count; (Tracking might break)

✅ const value = useSignal(count);
```

🛠️ Debugging with "Effects"
If you're wondering why a value isn't updating, add a temporary effect in your store file. It will log every change to the console:

```typeScript

effect(() => {
  console.log("[DEBUG] Count changed to:", count.get());
});
```

# License

MIT © akinnez/Nabd
