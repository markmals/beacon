import { Signal } from 'signal-polyfill';

declare global {
    interface SymbolConstructor {
        readonly signal: unique symbol;
    }
}

(Symbol.signal as any) = Symbol.for('signal');

export type Signal<T> = {
    [Symbol.signal]: true;
    get(): T;
    changes(): AsyncIterable<T> & Disposable;
};

export type State<T> = Signal<T> & {
    set(newValue: T): void;
    update(updater: (oldValue: T) => T): void;
    // mutate(mutator: (inoutValue: T) => void): void;
};

class StateImpl<T> implements State<T> {
    [Symbol.signal]: true = true;

    #signal: Signal.State<T>;

    constructor(initialValue: T) {
        this.#signal = new Signal.State(initialValue);
    }

    get(): T {
        return this.#signal.get();
    }

    set(newValue: T) {
        this.#signal.set(newValue);
    }

    update(updater: (oldValue: T) => T) {
        return updater(this.get());
    }

    // TODO: In-place mutation
    // mutate(mutator: (inoutValue: T) => void) {
    //     mutator(this.get());
    // }

    changes() {
        return new SignalIterator<T>(this.#signal);
    }
}

class SignalIterator<T> implements AsyncIterable<T>, Disposable {
    #signal: Signal.State<T> | Signal.Computed<T>;
    #ref?: EffectRef = undefined;

    constructor(signal: Signal.State<T> | Signal.Computed<T>) {
        this.#signal = signal;
    }

    async *[Symbol.asyncIterator]() {
        let promises: Promise<T>[] = [];
        let resolve: (value: T) => void;
        promises.push(
            new Promise(r => {
                resolve = r;
            }),
        );

        this.#ref = effect(() => {
            resolve(this.#signal.get());
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

export function state<T>(initialValue: T): State<T> {
    return new StateImpl(initialValue);
}

export function computed<T>(computation: () => T): Signal<T> {
    let signal = new Signal.Computed(computation);
    return {
        [Symbol.signal]: true,
        get: () => signal.get(),
        changes: () => new SignalIterator<T>(signal),
    };
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

export type EffectRef = Disposable & {
    unwatch(): void;
};

export function effect(onChange: () => void): EffectRef {
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
    return value?.[Symbol.signal];
}

// let counter = state(0);
// let doubled = computed(() => counter.get() * 2);

// async function processChanges() {
//     for await (let count of counter.changes()) {
//         console.log('for-await', count + 2);
//     }
// }

// processChanges();

// effect(() => {
//     console.log('doubled effect', doubled.get());
// });

// counter.set(1);
// counter.update(c => c + 5);

// TODO: resource
// TODO: selector
// TODO: mapArray
// TODO: indexArray
