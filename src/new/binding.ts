import { Signal, createSignalImpl } from '.';

export type Binding<Wrapped> = Signal<Wrapped> & {
    set: (newValue: Wrapped) => void;
};

export type Bindable<Value extends object> = Value & {
    [Prop in keyof Value & string as `$${Prop}`]: Binding<Value[Prop]>;
};

export function bindable<Value extends object>(store: Value): Bindable<Value> {
    return Object.assign(
        store,
        Object.getOwnPropertyNames(store).map(key => ({
            [`$${key}`]: createSignalImpl(
                { get: () => Reflect.get(store, key) },
                {
                    set: (newValue: any) => {
                        Reflect.set(store, key, newValue);
                    },
                },
            ),
        })),
    ) as Bindable<Value>;
}
