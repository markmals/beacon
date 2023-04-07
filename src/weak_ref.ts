// `WeakRef` is not always defined in every TypeScript environment. Instead,
// we alias it as a local export by reading it off of the global context.

export interface WeakRef<T extends object> {
    deref(): T | undefined;
}

export interface WeakRefCtor {
    new <T extends object>(value: T): WeakRef<T>;
}

export const WeakRef: WeakRefCtor = (globalThis as any)['WeakRef'];
