import { Signal } from 'signal-polyfill';

export interface ObservableIterable {
    changesFor<Key extends keyof this>(key: Exclude<Key, 'changesFor'>): AsyncIterable<this[Key]>;
}

const UNINITIALIZED = Symbol();

export interface ObservableObjectConstructor {
    new (...args: any[]): Record<PropertyKey, any> & ObservableIterable;
}

export type ObservableObject = Record<PropertyKey, any> &
    ObservableIterable & {
        [Symbol.metadata]: Metadata;
    };

class Metadata {
    signals = new Map<PropertyKey, Signal.State<any>>();
    version = new Signal.State(0);
    isArray: boolean;

    constructor(value: any) {
        this.isArray = Array.isArray(value);
    }
}

export namespace ObservableProxy {
    export type Options = {
        ignoredProperties?: PropertyKey[];
        nestReactivity?: boolean;
    };

    export function from<Object extends ObservableObject>(
        value: Object,
        { ignoredProperties = [], nestReactivity = true }: Options = {
            ignoredProperties: [],
            nestReactivity: true,
        },
    ): Object {
        if (
            typeof value === 'object' &&
            value != null &&
            !Object.isFrozen(value) &&
            // Make sure this isn't already an ObservableObject being tracked
            !(value[Symbol.metadata].signals instanceof Map)
        ) {
            let prototype = Object.getPrototypeOf(value);

            // TODO: Handle Map and Set as well
            if (prototype === Object.prototype || prototype === Array.prototype) {
                Object.defineProperty(value, Symbol.metadata, {
                    value: new Metadata(value),
                    writable: false,
                });

                return new Proxy(value, ProxyHandler.from({ ignoredProperties, nestReactivity }));
            }
        }

        return value;
    }
}

namespace ProxyHandler {
    export function from<Object extends ObservableObject>({
        ignoredProperties,
        nestReactivity,
    }: {
        ignoredProperties: PropertyKey[];
        nestReactivity?: boolean;
    }): ProxyHandler<Object> {
        return {
            defineProperty(target, key, descriptor) {
                if (descriptor.value) {
                    let state = target[Symbol.metadata].signals.get(key);
                    if (state !== undefined) {
                        state.set(
                            nestReactivity
                                ? ObservableProxy.from(descriptor.value)
                                : descriptor.value,
                        );
                    }
                }

                return Reflect.defineProperty(target, key, descriptor);
            },

            deleteProperty(target, key) {
                let state = target[Symbol.metadata].signals.get(key);
                if (state !== undefined) {
                    state.set(UNINITIALIZED);
                }

                if (key in target) {
                    let value = target[Symbol.metadata].version.get();
                    target[Symbol.metadata].version.set(value + 1);
                }

                return Reflect.deleteProperty(target, key);
            },

            get(target, key, receiver) {
                let state = target[Symbol.metadata].signals.get(key);

                // If we're reading a property in a reactive context, create a signal,
                // but only if it's an own property and not a prototype property
                if (
                    state === undefined &&
                    !ignoredProperties.includes(key) &&
                    Signal.subtle.currentComputed() !== null &&
                    (!(key in target) || Object.getOwnPropertyDescriptor(target, key)?.writable)
                ) {
                    state = new Signal.State(
                        nestReactivity
                            ? ObservableProxy.from(Reflect.get(target, key, receiver))
                            : Reflect.get(target, key, receiver),
                    );
                    target[Symbol.metadata].signals.set(key, state);
                }

                let value = state !== undefined ? state.get() : Reflect.get(target, key, receiver);
                return value === UNINITIALIZED ? undefined : value;
            },

            getOwnPropertyDescriptor(target, key) {
                let descriptor = Reflect.getOwnPropertyDescriptor(target, key);
                if (descriptor && 'value' in descriptor) {
                    let state = target[Symbol.metadata].signals.get(key);

                    if (state) {
                        descriptor.value = state.get();
                    }
                }

                return descriptor;
            },

            has(target, key) {
                if (key === Symbol.metadata) {
                    return true;
                }
                let has = Reflect.has(target, key);

                let state = target[Symbol.metadata].signals.get(key);
                if (
                    state !== undefined ||
                    // TODO: How to ignore observation here
                    // !ignoredProperties.includes(prop) &&
                    (Signal.subtle.currentComputed() !== null && !has) ||
                    Object.getOwnPropertyDescriptor(target, key)?.writable
                ) {
                    if (state === undefined) {
                        state = new Signal.State(
                            has
                                ? nestReactivity
                                    ? ObservableProxy.from(target[key])
                                    : target[key]
                                : UNINITIALIZED,
                        );
                        target[Symbol.metadata].signals.set(key, state);
                    }
                    let value = state.get();
                    if (value === UNINITIALIZED) {
                        return false;
                    }
                }
                return has;
            },

            set(target, key, value) {
                let state = target[Symbol.metadata].signals.get(key);
                if (state !== undefined) {
                    state.set(nestReactivity ? ObservableProxy.from(value) : value);
                }

                if (target[Symbol.metadata].isArray && key === 'length') {
                    for (let i = value; i < target.length; i += 1) {
                        let state = target[Symbol.metadata].signals.get(i + '');
                        if (state !== undefined) {
                            state.set(UNINITIALIZED);
                        }
                    }
                }

                if (!(key in target)) {
                    let value = target[Symbol.metadata].version.get();
                    target[Symbol.metadata].version.set(value + 1);
                }

                Reflect.set(target, key, value);

                return true;
            },

            ownKeys(target) {
                target[Symbol.metadata].version.get();
                return Reflect.ownKeys(target);
            },
        };
    }
}
