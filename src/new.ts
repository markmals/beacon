import { Signal } from 'signal-polyfill';

declare global {
    interface SymbolConstructor {
        readonly signal: unique symbol;
    }
}

(Symbol.signal as any) = Symbol.for('signal');

export type Signal<Wrapped> = {
    [Symbol.signal]: true;
    get(): Wrapped;
    changes(): AsyncIterable<Wrapped> & Disposable;
};

export type State<Wrapped> = Signal<Wrapped> & {
    set(newValue: Wrapped): void;
    update(updater: (oldValue: Wrapped) => Wrapped): void;
    // mutate(mutator: (inoutValue: Wrapped) => void): void;
};

class StateImpl<Wrapped> implements State<Wrapped> {
    [Symbol.signal]: true = true;

    #signal: Signal.State<Wrapped>;

    constructor(initialValue: Wrapped) {
        this.#signal = new Signal.State(initialValue);
    }

    get(): Wrapped {
        return this.#signal.get();
    }

    set(newValue: Wrapped) {
        this.#signal.set(newValue);
    }

    update(updater: (oldValue: Wrapped) => Wrapped) {
        return updater(this.get());
    }

    // TODO: In-place mutation
    // mutate(mutator: (inoutValue: Wrapped) => void) {
    //     mutator(this.get());
    // }

    changes() {
        return new SignalIterator<Wrapped>(this.#signal);
    }
}

class SignalIterator<Wrapped> implements AsyncIterable<Wrapped>, Disposable {
    #signal: Signal.State<Wrapped> | Signal.Computed<Wrapped>;
    #ref?: EffectRef = undefined;

    constructor(signal: Signal.State<Wrapped> | Signal.Computed<Wrapped>) {
        this.#signal = signal;
    }

    async *[Symbol.asyncIterator]() {
        let promises: Promise<Wrapped>[] = [];
        let resolve: (value: Wrapped) => void;
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

export function state<Wrapped>(initialValue: Wrapped): State<Wrapped> {
    return new StateImpl(initialValue);
}

export function computed<Wrapped>(computation: () => Wrapped): Signal<Wrapped> {
    let signal = new Signal.Computed(computation);
    return {
        [Symbol.signal]: true,
        get: () => signal.get(),
        changes: () => new SignalIterator<Wrapped>(signal),
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
