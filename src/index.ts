import {
    UnwrapRef,
    computed,
    pauseTracking,
    ref,
    resetTracking,
    effect as watchEffect,
} from '@vue/reactivity';

export interface ReadableSignal<T> {
    get value(): T;
}

export interface WritableSignal<T> extends ReadableSignal<T> {
    set value(newValue: T);
}

export interface EffectRef {
    destroy(): void;
}

(Symbol as any).signal ??= Symbol.for('beacon');

/**
 * Create a deeply reactive `Signal` that can be set or updated directly.
 */
export function signal<T>(initialValue: T): WritableSignal<T> {
    const instance = ref(initialValue);
    return {
        [(Symbol as any).signal]: true,
        get value() {
            return instance.value as T;
        },
        set value(newValue) {
            instance.value = newValue as UnwrapRef<T>;
        },
    } as WritableSignal<T>;
}

/**
 * Create a derived `Signal` which derives a reactive value from an expression.
 */
export function derived<T>(expression: () => T): ReadableSignal<T> {
    return {
        [(Symbol as any).signal]: true,
        get value() {
            return expression();
        },
    } as ReadableSignal<T>;
}

/**
 * Create a memoized `Signal` which derives a reactive value from an expression.
 */
export function memo<T>(computation: () => T): ReadableSignal<T> {
    const instance = computed(computation);
    return {
        [(Symbol as any).signal]: true,
        get value() {
            return instance.value;
        },
    } as ReadableSignal<T>;
}

/**
 * Create a global `Effect` for the given reactive function.
 */
export function effect(effectFunc: () => void): EffectRef {
    // { lazy: false } ?
    const unwatch = watchEffect(effectFunc);
    return {
        destroy() {
            unwatch();
        },
    };
}

/**
 * Execute an arbitrary function in a non-reactive (non-tracking) context. The executed function
 * can, optionally, return a value.
 */
export function untrack<T>(nonReactiveReadsFunc: () => T): T {
    pauseTracking();
    const value = nonReactiveReadsFunc();
    resetTracking();
    return value;
}

export function isSignal<T>(value: unknown): value is ReadableSignal<T> {
    return (value as any)?.[(Symbol as any).signal];
}
