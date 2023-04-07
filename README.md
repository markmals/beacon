# Beacon

Beacon is a fine-grained reactive state management library for TypeScript and JavaScript. It takes inspiration from [Solid](https://www.solidjs.com/guides/reactivity), [Preact](https://preactjs.com/guide/v10/signals/), [Vue](https://vuejs.org/guide/extras/reactivity-in-depth.html), and most importantly [Angular](https://github.com/angular/angular/tree/main/packages/core/src/signals). The implementation for Beacon is largely based on a pre-release version of the signals in `@angular/core`, before they were tightly integrated into and entangled with Angular's runtime.

## Usage

```typescript
import { signal, computed, effect } from '@beacon/core';

const counter = signal(0);

counter.set(2);
counter.update(count => count + 1);

const todoList = signal<Todo[]>([]);

todoList.mutate(list => {
    list.push({ title: 'One more task', completed: false });
});

// Automatically updates when `counter` changes:
const isEven = computed(() => counter() % 2 === 0);

effect(() => console.log('The counter is:', counter()));
// The counter is: 3

counter.set(1);
// The counter is: 1
```

## Building Your Own Signals

Beacon exposes functionality to create your own signals through the `@beacon/build` package:

```typescript
import {
    Producer,
    Signal,
    createSignalFromFunction,
    defaultEquals,
    producerAccessed,
    producerNotifyConsumers,
} from '@beacon/build';

class ListImpl<T> implements Producer {
    private value: T[];

    public constructor(initialValue: T[]) {
        this.value = initialValue;
    }

    public checkForChangedValue() {
        // List signals can only change when set, so there's nothing to check here.
    }

    public signal(): T[] {
        producerAccessed(this);
        return this.value;
    }

    public isEmpty(): boolean {
        return this.signal().length === 0;
    }

    private set(newValue: T[]) {
        if (!defaultEquals(this.value, newValue)) {
            this.value = newValue;
            producerNotifyConsumers(this);
        }
    }
}

export interface List<T> extends Signal<T[]> {
    isEmpty(): boolean;
}

export function list<T>(initialValue: T[]): List<T> {
    const node = new ListImpl(initialValue);
    return createSignalFromFunction(node.signal.bind(node), {
        isEmpty: node.isEmpty.bind(node),
    });
}
```

## License

Published under the [MIT License](./LICENSE).
