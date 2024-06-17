import { Signal } from 'signal-polyfill';
import './symbol-polyfills';

const SIGNAL_SYMBOL = Symbol('$signal');

export type ReadableSignal<T> = (() => T) & {
    [SIGNAL_SYMBOL]: true;
};

export type WritableSignal<T> = ReadableSignal<T> & {
    set(newValue: T): void;
    update(updater: (oldValue: T) => T): void;
    mutate(mutator: (value: T) => void): void;
};

/**
 * Create a deeply reactive `Signal` that can be set or updated directly.
 */
export function signal<T>(initialValue: T): WritableSignal<T> {
    const state = new Signal.State(initialValue);
    const signal = state.get.bind(state) as WritableSignal<T>;
    signal[SIGNAL_SYMBOL] = true;
    signal.set = newValue => state.set(newValue);
    signal.update = updater => updater(state.get());
    // TODO: In-place mutation
    // signal.mutate = mutator => mutator(state.get())
    return signal;
}

/**
 * Create a derived `Signal` which derives a reactive value from an expression.
 */
export function derived<T>(expression: () => T): ReadableSignal<T> {
    const signal = expression as ReadableSignal<T>;
    signal[SIGNAL_SYMBOL] = true;
    return signal;
}

/**
 * Create a memoized `Signal` which derives a reactive value from an expression.
 */
export function memo<T>(computation: () => T): ReadableSignal<T> {
    const computed = new Signal.Computed(computation);
    const memoizedSignal = computed.get.bind(computed) as ReadableSignal<T>;
    memoizedSignal[SIGNAL_SYMBOL] = true;
    return memoizedSignal;
}

let needsEnqueue = false;

const watcher = new Signal.subtle.Watcher(() => {
    if (needsEnqueue) {
        needsEnqueue = false;
        queueMicrotask(processPendingEffects);
    }
});

function processPendingEffects() {
    needsEnqueue = true;

    for (const signal of watcher.getPending()) {
        signal.get();
    }

    watcher.watch();
}

/**
 * Create a global `Effect` for the given reactive function.
 */
export function effect(onChange: () => void): DisposableStack {
    const computed = new Signal.Computed(onChange);
    watcher.watch(computed);
    computed.get();

    const cleanup = new DisposableStack();
    cleanup.defer(() => watcher.unwatch(computed));

    return cleanup;
}

/**
 * Execute an arbitrary function in a non-reactive (non-tracking) context. The executed function
 * can, optionally, return a value.
 */
export function untrack<T>(nonReactiveReadsFn: () => T): T {
    return Signal.subtle.untrack(nonReactiveReadsFn);
}

export function isSignal<T>(value: any): value is ReadableSignal<T> {
    return value?.[SIGNAL_SYMBOL];
}
