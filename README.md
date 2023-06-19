# Beacon

Beacon is a fine-grained reactive state management library for TypeScript and JavaScript. It takes inspiration from [Solid](https://www.solidjs.com/guides/reactivity), [Preact](https://preactjs.com/guide/v10/signals/), [Vue](https://vuejs.org/guide/extras/reactivity-in-depth.html), and [Angular](https://github.com/angular/angular/tree/main/packages/core/src/signals). Beacon uses `@vue/reactivity` under the hood and should work with any Vue projects.

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

## License

Published under the [MIT License](./LICENSE).
