import { Signal } from 'signal-polyfill';
import './symbol-polyfills';

/**
 * Disables reactivity tracking of a property.
 *
 * @remarks
 * By default, an object can observe any property of a reactive class that
 * is accessible to the reactive object. To prevent tracking of an accessible
 * property, attach the `@untracked()` decorator to the property.
 *
 * @alpha
 */
export function untracked() {
    return (_target: any, context: PropertyContext) => {
        if (context.static || context.private) {
            throw new TypeError('@untracked can only be applied to public instance members.');
        }

        const untrackedProps = (context.metadata[UNTRACKED] ??= []) as (string | symbol)[];
        untrackedProps.push(context.name);
    };
}

export type ReactiveClassCtor = {
    new (...args: any[]): object;
};

/**
 * A decorator that implements deeply nested reactivity for each property on the decorated class.
 *
 * @remarks
 * Decorating a class with this decorator signals to other APIs that the class supports
 * reactivity.
 *
 * @example
 * The following code applies the `@reactive` decorator to the type `Car` making it observable:
 *
 * ```ts
 * \@reactive
 * class Car {
 *      name: string = ""
 *      needsRepairs: boolean = false
 *
 *      constructor(name: string, needsRepairs: boolean = false) {
 *          this.name = name
 *          this.needsRepairs = needsRepairs
 *      }
 * }
 * ```
 *
 * @alpha
 */
export function reactive<TargetCtor extends ReactiveClassCtor>() {
    return (Target: TargetCtor, context: ClassDecoratorContext) => {
        if (context.kind !== 'class') {
            throw new TypeError('@reactive must be applied to a class.');
        }

        return class Reactive extends Target {
            constructor(...args: any[]) {
                super(...args);

                const metadata = (Target[Symbol.metadata] ??= {});
                const untrackedProps = (metadata[UNTRACKED] ??= []) as (string | symbol)[];

                return createProxy({ value: this as ReactiveObject, untrackedProps });
            }
        } as TargetCtor;
    };
}

export function signal<Host, Value>() {
    return (
        _value: ClassAccessorDecoratorTarget<Host, Value>,
        context: ClassAccessorDecoratorContext<Host, Value>,
    ) => {
        if (context.static) {
            throw new TypeError('@signal can only be applied to instance members.');
        }

        const state = new Signal.State(UNINITIALIZED as Value);

        return {
            init(initialValue) {
                state.set(initialValue);
                return state.get();
            },
            get() {
                return state.get();
            },
            set(newValue) {
                state.set(newValue);
            },
        } as ClassAccessorDecoratorResult<Host, Value>;
    };
}

export function memo<Host, Value>() {
    return (value: (this: Host) => Value, context: ClassGetterDecoratorContext<Host, Value>) => {
        if (context.static) {
            throw new TypeError('@memo can only be applied to instance members.');
        }

        let computed: Signal.Computed<Value>;

        return function (this: Host) {
            return (computed ??= new Signal.Computed(value.bind(this))).get();
        };
    };
}

const REACTIVE = Symbol('$reactive');
const UNTRACKED = Symbol('$untracked');
const UNINITIALIZED = Symbol('$uninitialized');

type ReactiveObject = Record<string | symbol, any> & { [REACTIVE]: Metadata };

type PropertyContext =
    | ClassAccessorDecoratorContext
    | ClassGetterDecoratorContext
    | ClassFieldDecoratorContext;

interface Metadata {
    signals: Map<string | symbol, Signal.State<any>>;
    version: Signal.State<number>;
    isArray: boolean;
}

type ProxyOptions<Object extends ReactiveObject> = {
    value: Object;
    untrackedProps?: (string | symbol)[];
};

function createProxy<Object extends ReactiveObject>({
    value,
    untrackedProps = [],
}: ProxyOptions<Object>): Object {
    if (
        typeof value === 'object' &&
        value != null &&
        !Object.isFrozen(value) &&
        !(REACTIVE in value)
    ) {
        const prototype = Object.getPrototypeOf(value);

        // TODO: Handle Map and Set as well
        if (prototype === Object.prototype || prototype === Array.prototype) {
            Object.defineProperty(value, REACTIVE, {
                value: createMetadata(value),
                writable: false,
            });

            return new Proxy(value, createHandler({ untrackedProps }) as ProxyHandler<Object>);
        }
    }

    return value;
}

function createMetadata<Value>(value: Value): Metadata {
    return {
        signals: new Map(),
        version: new Signal.State(0),
        isArray: Array.isArray(value),
    };
}

function createHandler({
    untrackedProps,
}: {
    untrackedProps: (string | symbol)[];
}): ProxyHandler<ReactiveObject> {
    return {
        defineProperty(target, key, descriptor) {
            if (descriptor.value) {
                const metadata = target[REACTIVE];

                const state = metadata.signals.get(key);
                if (state !== undefined) {
                    state.set(createProxy({ value: descriptor.value }));
                }
            }

            return Reflect.defineProperty(target, key, descriptor);
        },

        deleteProperty(target, key) {
            const metadata = target[REACTIVE];

            const state = metadata.signals.get(key);
            if (state !== undefined) {
                state.set(UNINITIALIZED);
            }

            if (key in target) {
                const value = metadata.version.get();
                metadata.version.set(value + 1);
            }

            return delete target[key];
        },

        get(target, key, receiver) {
            const metadata = target[REACTIVE];
            let state = metadata.signals.get(key);

            // If we're reading a property in a reactive context, create a signal,
            // but only if it's an own property and not a prototype property
            if (
                state === undefined &&
                !untrackedProps.includes(key) &&
                Signal.subtle.currentComputed() !== null &&
                (!(key in target) || Object.getOwnPropertyDescriptor(target, key)?.writable)
            ) {
                state = new Signal.State(createProxy({ value: target[key] }));
                metadata.signals.set(key, state);
            }

            const value = state !== undefined ? state.get() : Reflect.get(target, key, receiver);
            return value === UNINITIALIZED ? undefined : value;
        },

        getOwnPropertyDescriptor(target, key) {
            const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
            if (descriptor && 'value' in descriptor) {
                const metadata = target[REACTIVE];
                const state = metadata.signals.get(key);

                if (state) {
                    descriptor.value = state.get();
                }
            }

            return descriptor;
        },

        has(target, key) {
            if (key === REACTIVE) {
                return true;
            }
            const metadata = target[REACTIVE];
            const has = Reflect.has(target, key);

            let state = metadata.signals.get(key);
            if (
                state !== undefined ||
                // TODO: How to ignore observation here
                // !ignoredProperties.includes(prop) &&
                (Signal.subtle.currentComputed() !== null && !has) ||
                Object.getOwnPropertyDescriptor(target, key)?.writable
            ) {
                if (state === undefined) {
                    state = new Signal.State(
                        has ? createProxy({ value: target[key] }) : UNINITIALIZED,
                    );
                    metadata.signals.set(key, state);
                }
                const value = state.get();
                if (value === UNINITIALIZED) {
                    return false;
                }
            }
            return has;
        },

        set(target, key, value) {
            const metadata = target[REACTIVE];

            const state = metadata.signals.get(key);
            if (state !== undefined) {
                state.set(createProxy(value));
            }

            if (metadata.isArray && key === 'length') {
                for (let i = value; i < target.length; i += 1) {
                    const state = metadata.signals.get(i + '');
                    if (state !== undefined) {
                        state.set(UNINITIALIZED);
                    }
                }
            }

            if (!(key in target)) {
                const value = metadata.version.get();
                metadata.version.set(value + 1);
            }

            target[key] = value;

            return true;
        },

        ownKeys(target) {
            const metadata = target[REACTIVE];
            metadata.version.get();
            return Reflect.ownKeys(target);
        },
    };
}
