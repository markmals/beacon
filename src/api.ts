import type { Ref } from '@vue/reactivity';

export type Signal<T> = (() => T) & {
    /**
     * Returns the current value of the signal without notifying the reactive graph
     * that `this` producer was accessed.
     */
    peek(): T;
};

/**
 * A `Signal` with a value that can be mutated via a setter interface.
 */
export interface SettableSignal<T> extends Signal<T> {
    /**
     * Directly set the signal to a new value, and notify any dependents.
     */
    set(value: T): void;

    /**
     * Update the value of the signal based on its current value, and
     * notify any dependents.
     */
    update(updateFunc: (value: T) => T): void;

    /**
     * Update the current value by mutating it in-place, and
     * notify any dependents.
     */
    mutate(mutatorFunc: (value: T) => void): void;
}

/**
 * A global reactive effect, which can be manually scheduled or destroyed.
 */
export interface EffectRef {
    /**
     * Schedule the effect for manual execution, if it's not already.
     */
    schedule(): void;

    /**
     * Shut down the effect, removing it from any upcoming scheduled executions.
     */
    destroy(): void;
}

/**
 * Converts `func` into a signal function, and potentially add some set of extra
 * properties (passed as an object record `extraAPI`).
 */
export function createSignalFromRef<T, U extends Record<string, unknown> = {}>(
    ref: Ref<T>,
    extraAPI: U = {} as U
): (() => T) & U {
    const func = () => ref.value;
    (extraAPI as any)._ref = ref;
    // Copy properties from `extraAPI` to `func` to complete the desired API of the `Signal`.
    return Object.assign(func, extraAPI);
}
