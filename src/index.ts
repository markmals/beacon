import {
    Ref,
    computed as _computed,
    effect as _effect,
    pauseTracking,
    resetTracking,
    shallowRef,
    triggerRef,
} from '@vue/reactivity';
import { EffectRef, SettableSignal, Signal, createSignalFromRef } from './api.js';

/**
 * Create a `Signal` that can be set or updated directly.
 */
export function signal<T>(initialValue: T): SettableSignal<T> {
    const ref = shallowRef(initialValue);
    return createSignalFromRef(ref, {
        peek() {
            return untracked(() => ref.value);
        },
        set(value: T) {
            ref.value = value;
        },
        update(updater: (value: T) => T) {
            ref.value = updater(ref.value);
        },
        mutate(mutator: (value: T) => void) {
            mutator(ref.value);
            triggerRef(ref);
        },
    });
}

/**
 * Create a computed `Signal` which derives a reactive value from an expression.
 */
export function computed<T>(computation: () => T): Signal<T> {
    const ref = _computed(computation);
    return createSignalFromRef(ref, {
        peek() {
            return untracked(() => ref.value);
        },
    });
}

/**
 * Create a global `Effect` for the given reactive function.
 */
export function effect(effectFunc: () => void): EffectRef {
    const runner = _effect(effectFunc);
    return {
        schedule() {
            runner.effect.run();
        },
        destroy() {
            runner.effect.stop();
        },
    };
}

/**
 * Execute an arbitrary function in a non-reactive (non-tracking) context. The executed function
 * can, optionally, return a value.
 */
export function untracked<T>(nonReactiveReadsFunc: () => T): T {
    pauseTracking();
    const value = nonReactiveReadsFunc();
    resetTracking();
    return value;
}

export type { EffectRef, SettableSignal, Signal };

/**
 * Exposes the value of a `Signal` as a Vue `Ref`.
 */
export function fromSignal<T>(signal: SettableSignal<T>): Ref<T> {
    return (signal as any)._ref;
}

/**
 * Get the current value of a `Ref` as a reactive `Signal`.
 */
export function fromRef<T>(ref: Ref<T>): Signal<T> {
    return createSignalFromRef(ref, {
        peek() {
            return untracked(() => ref.value);
        },
    });
}
