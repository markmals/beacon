import { Signal } from 'signal-polyfill';

declare global {
    interface SymbolConstructor {
        readonly signal: unique symbol;
    }
}

(Symbol.signal as any) = Symbol.for('signal');

export type SignalIterable<Wrapped> = {
    changes(): AsyncIterable<Wrapped> & Disposable;
};

export type Signal<Wrapped> = SignalIterable<Wrapped> & {
    [Symbol.signal]: true;
    get(): Wrapped;
};

/**
 * A `Signal` with a value that can be mutated via a setter interface.
 */
export type State<Wrapped> = Signal<Wrapped> &
    SignalIterable<Wrapped> & {
        /**
         * Directly set the state to a new value, and notify any dependents.
         */
        set(newValue: Wrapped): void;

        /**
         * Update the value of the state based on its current value, and
         * notify any dependents.
         */
        update(updater: (oldValue: Wrapped) => Wrapped): void;

        /**
         * Update the current value by mutating it in-place, and
         * notify any dependents.
         */
        mutate(mutator: (inoutValue: Wrapped) => void): void;

        /**
         * Returns a readonly version of this signal. Readonly signals can be accessed to read their value
         * but can't be changed using set, update or mutate methods. The readonly signals do _not_ have
         * any built-in mechanism that would prevent deep-mutation of their value.
         */
        asReadonly(): Signal<Wrapped>;
    };

/**
 * A comparison function which can determine if two values are equal.
 */
export type ValueEqualityFn<T> = (a: T, b: T) => boolean;

/**
 * Options passed to the `state` creation function.
 */
export interface CreateStateOptions<T> {
    /**
     * A comparison function which defines equality for state values.
     */
    equal?: ValueEqualityFn<T>;
}

export function defaultEquals<T>(a: T, b: T) {
    // `Object.is` compares two values using identity semantics which is desired behavior for
    // primitive values. If `Object.is` determines two values to be equal we need to make sure that
    // those don't represent objects (we want to make sure that 2 objects are always considered
    // "unequal"). The null check is needed for the special case of JavaScript reporting null values
    // as objects (`typeof null === 'object'`).
    return (a === null || typeof a !== 'object') && Object.is(a, b);
}

class SignalIterator<Wrapped> implements AsyncIterable<Wrapped>, Disposable {
    #accessor: () => Wrapped;
    #ref?: WatchRef;

    constructor(accessor: () => Wrapped) {
        this.#accessor = accessor;
    }

    async *[Symbol.asyncIterator]() {
        let promises: Promise<Wrapped>[] = [];
        let resolve: (value: Wrapped) => void;
        promises.push(
            new Promise(r => {
                resolve = r;
            }),
        );

        this.#ref = watch(() => {
            resolve(this.#accessor());
            promises.push(
                new Promise(r => {
                    resolve = r;
                }),
            );
        });

        for (let promise of promises) {
            let value = await promise;
            delete promises[promises.indexOf(promise)];
            yield value;
        }
    }

    [Symbol.dispose]() {
        this.#ref?.unwatch();
    }
}

export function createSignalImpl<Wrapped, Extras = unknown>(
    options: { get: () => Wrapped },
    extras?: Extras,
): Signal<Wrapped> & Extras {
    return {
        [Symbol.signal]: true,
        get: options.get,
        changes: () => new SignalIterator(options.get),
        ...extras,
    } as Signal<Wrapped> & Extras;
}

/**
 * Create a `State` that can be set or updated directly.
 */
export function state<Wrapped>(
    initialValue: Wrapped,
    options: CreateStateOptions<Wrapped> = { equal: defaultEquals },
): State<Wrapped> {
    let signal = new Signal.State(initialValue, { equals: options.equal });
    let impl = createSignalImpl(
        {
            get() {
                return signal.get();
            },
        },
        {
            set(newValue: Wrapped) {
                signal.set(newValue);
            },

            update(updater: (oldValue: Wrapped) => Wrapped) {
                return updater(untrack(() => signal.get()));
            },

            mutate(mutator: (inoutValue: Wrapped) => void) {
                mutator(untrack(() => signal.get()));
            },

            asReadonly: () => createSignalImpl({ get: () => signal.get() }),
        },
    );

    return impl;
}

/**
 * Options passed to the `computed` creation function.
 */
export interface CreateComputedOptions<T> {
    /**
     * A comparison function which defines equality for computed values.
     */
    equal?: ValueEqualityFn<T>;
}

/**
 * Create a computed `Signal` which derives a reactive value from an expression.
 */
export function computed<Wrapped>(
    expression: () => Wrapped,
    options: CreateComputedOptions<Wrapped> = { equal: defaultEquals },
): Signal<Wrapped> {
    let signal = new Signal.Computed(expression, { equals: options.equal });
    return createSignalImpl({ get: () => signal.get() });
}

let needsEnqueue = false;

let watcher = new Signal.subtle.Watcher(() => {
    if (needsEnqueue) {
        needsEnqueue = false;
        queueMicrotask(processPendingEffects);
    }
});

function processPendingEffects() {
    needsEnqueue = true;

    for (let signal of watcher.getPending()) {
        signal.get();
    }

    watcher.watch();
}

/**
 * A global reactive watcher, which can be manually triggered to stop watching.
 */
export type WatchRef = Disposable & {
    /**
     * Shut down the watcher, removing it from any upcoming scheduled executions.
     */
    unwatch(): void;
};

/**
 * Create a global `WatchRef` for the given reactive function.
 */
export function watch(onChange: () => void): WatchRef {
    let computed = new Signal.Computed(onChange);

    watcher.watch(computed);
    computed.get();

    return {
        [Symbol.dispose]() {
            watcher.unwatch(computed);
        },
        unwatch() {
            this[Symbol.dispose]();
        },
    };
}

export function untrack<T>(nonReactiveReadsFn: () => T): T {
    return Signal.subtle.untrack(nonReactiveReadsFn);
}

export function isSignal<T>(value: any): value is Signal<T> {
    return value?.[Symbol.signal] ?? false;
}

// let counter = state(0);
// let doubled = computed(() => `Double ${counter.get()} is ${counter.get() * 2}`);

// async function processChanges() {
//     for await (let count of counter.changes()) {
//         console.log('for-await', count + 2);
//     }
// }

// processChanges();

// watch(() => {
//     console.log(doubled.get());
// });

// counter.set(1);
// counter.update(c => c + 5);

// TODO: resource
// TODO: selector
// TODO: mapArray
// TODO: indexArray
