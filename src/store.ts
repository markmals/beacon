import { SettableSignal, Signal, createSignalFromRef } from './api.js';
import { fromSignal, signal } from './index.js';
import {
    BrowserStorageEngine,
    MemoryStorageEngine,
    StorageEngine,
} from './storage-engines/index.js';

export interface ToString {
    toString(): string;
}

export interface Identifiable {
    id: ToString;
}

export interface StoreOptions<Output> {
    key: string;
    provider?: typeof MemoryStorageEngine<Output> | typeof BrowserStorageEngine<Output>;
    initialValue?: Output[];
}

export interface Store<Output extends Identifiable> extends Signal<Output[]> {
    add(item: Output | Output[]): void;
    delete(item: Output | Output[]): void;
    clear(): void;
    isEmpty(): boolean;
}

class StoreImpl<Output extends Identifiable> {
    value: SettableSignal<Output[]>;
    private storageEngine: StorageEngine<Output>;

    constructor({ key, provider = BrowserStorageEngine, initialValue }: StoreOptions<Output>) {
        this.storageEngine = new provider(key);

        if (initialValue !== undefined) {
            this.value = signal(initialValue);
        } else {
            // Populate the state with any existing database data
            let items = this.storageEngine.get();
            this.value = signal(items ?? []);
        }
    }

    isEmpty(): boolean {
        return this.value().length === 0;
    }

    add(item: Output | Output[]) {
        let currentValuesMap = new Map<string, Output>();

        if (Array.isArray(item)) {
            let addedItemsMap = new Map<string, Output>();

            // Deduplicate items passed into `add(items)` by taking advantage
            // of the fact that a Map can't have duplicate keys.
            for (let newItem of item) {
                let identifier = newItem.id.toString();
                addedItemsMap.set(identifier, newItem);
            }

            // Take the current items array and turn it into a Map.
            for (let currentItem of this.value()) {
                currentValuesMap.set(currentItem.id.toString(), currentItem);
            }

            // Add the new items into the dictionary representation of our items.
            for (let [key, newItem] of addedItemsMap) {
                currentValuesMap.set(key, newItem);
            }

            // We persist only the newly added items, rather than rewriting all of the items
            this.persist(Array.from(addedItemsMap.values()));
        } else {
            let identifier = item.id.toString();

            for (let currentItem of this.value()) {
                currentValuesMap.set(currentItem.id.toString(), currentItem);
            }

            currentValuesMap.set(identifier, item);

            // We persist only the newly added item, rather than rewriting all of the items
            this.persist(item);
        }

        this.value.set(Array.from(currentValuesMap.values()));
    }

    delete(item: Output | Output[]) {
        let values: Output[] = Array.isArray(item) ? item : [item];
        this.deletePersisted(item);
        this.value.update($ =>
            $.filter(
                currentItem => !values.map(i => String(i.id)).includes(currentItem.id.toString())
            )
        );
    }

    // TODO: Patch?

    clear() {
        this.storageEngine.clear();
        this.value.set([]);
    }

    private persist(item: Output | Output[]) {
        if (Array.isArray(item)) {
            let items = item;
            for (const item of items) {
                this.persist(item);
            }
        } else {
            let identifier = item.id.toString();
            this.storageEngine.set(identifier, item);
        }
    }

    private deletePersisted(item: Output | Output[]) {
        if (Array.isArray(item)) {
            let items = item;
            for (const item of items) {
                this.deletePersisted(item);
            }
        } else {
            let identifier = item.id.toString();
            this.storageEngine.delete(identifier);
        }
    }
}

export function store<Output extends Identifiable>({
    key,
    provider = BrowserStorageEngine,
    initialValue,
}: StoreOptions<Output>): Store<Output> {
    const node = new StoreImpl({ key, provider, initialValue });
    return createSignalFromRef(fromSignal(node.value), {
        peek() {
            return node.value.peek();
        },
        add: node.add.bind(node),
        delete: node.delete.bind(node),
        clear: node.clear.bind(node),
        isEmpty: node.isEmpty.bind(node),
    });
}
