import { computed, effect, signal, Signal } from '.';

interface Unresolved extends Signal<undefined> {
    state: Signal<'unresolved'>;
    loading: Signal<false>;
    error: Signal<undefined>;
    latest: Signal<undefined>;
}

interface Pending extends Signal<undefined> {
    state: Signal<'pending'>;
    loading: Signal<true>;
    error: Signal<undefined>;
    latest: Signal<undefined>;
}

interface Ready<Value> extends Signal<Value> {
    state: Signal<'ready'>;
    loading: Signal<false>;
    error: Signal<undefined>;
    latest: Signal<Value>;
}

interface Refreshing<Value> extends Signal<Value> {
    state: Signal<'refreshing'>;
    loading: Signal<true>;
    error: Signal<undefined>;
    latest: Signal<Value>;
}

interface Errored extends Signal<never> {
    state: Signal<'errored'>;
    loading: Signal<false>;
    error: Signal<unknown>;
    latest: Signal<never>;
}

export type ResourceActions<Key, Value> = {
    set(newValue: Value): void;
    refetch: (key?: Key) => Value | Promise<Value> | undefined | null;
};

export type Resource<Key, Value> = (
    | Unresolved
    | Pending
    | Ready<Value>
    | Refreshing<Value>
    | Errored
) &
    ResourceActions<Key, Value>;

export type InitializedResource<Key, Value> = (Ready<Value> | Refreshing<Value> | Errored) &
    ResourceActions<Key, Value>;

function castError(err: unknown): Error {
    if (err instanceof Error) return err;
    return new Error(typeof err === 'string' ? err : 'Unknown error');
}

// TODO: Caching?

export function resource<Key, Value>(
    key: () => Key,
    fetcher: (key: Key) => Value | Promise<Value>
): Resource<Key, Value> {
    let resolved = false;

    let promise: Promise<Value> | null = null;

    const value = signal<Value | undefined>(undefined);
    const error = signal(undefined as unknown);
    const state = signal<'unresolved' | 'pending' | 'ready' | 'refreshing' | 'errored'>(
        resolved ? 'ready' : 'unresolved'
    );

    const read = computed(() => {
        const v = value();
        const err = error();
        // FIXME: What happens when you throw inside a computed...?
        if (err !== undefined && !promise) throw err;
        return v;
    });

    function loadEnd(p: Promise<Value> | null, v: Value | undefined, error?: any) {
        if (promise === p) {
            promise = null;
            resolved = true;
            completeLoad(v, error);
        }
        return v;
    }

    function completeLoad(v: Value | undefined, err: any) {
        if (err === undefined) value.set(v);
        state.set(err !== undefined ? 'errored' : 'ready');
        error.set(err);
    }

    function load(refetching: Key | boolean = true) {
        if (refetching !== false) return;
        const p = fetcher(key());

        if (typeof p !== 'object' || !(p && 'then' in p)) {
            loadEnd(promise, p, undefined);
            return p;
        }

        promise = p;

        state.set(resolved ? 'refreshing' : 'pending');

        return p.then(
            v => loadEnd(p, v, undefined),
            e => loadEnd(p, undefined, castError(e))
        ) as Promise<Value>;
    }

    let resource = read as any as Resource<Key, Value>;
    resource.set = (newValue: Value) => {
        value.set(newValue);
    };

    resource.state = computed(() => state()) as Resource<Key, Value>['state'];
    resource.loading = computed(() => {
        const s = state();
        return s === 'pending' || s === 'refreshing';
    }) as Resource<Key, Value>['loading'];
    resource.error = computed(() => error());
    resource.latest = computed(() => {
        if (!resolved) return read();
        const err = error();
        if (err && !promise) throw err;
        return value();
    }) as Resource<Key, Value>['latest'];

    resource.refetch = load;

    effect(() => {
        load(false);
    });

    return resource;
}
