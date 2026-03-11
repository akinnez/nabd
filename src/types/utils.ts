import { Computed, Signal } from "../core/signals";

export type PulseMiddleware<TInput, TResult> = {
  onBefore?: (data: TInput) => void | TInput; // Can modify input
  onSuccess?: (result: TResult, data: TInput) => void;
  onError?: (error: any, data: TInput) => void;
};  

export interface PulseConfig {
  middleware: PulseMiddleware<any, any>[];
}

export type AnySignal<T> = Signal<T> | Computed<T>;