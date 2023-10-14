# Beacon

> [!NOTE]  
> Beacon is not yet published to npm.

Beacon is a pull-based reactive state management library for TypeScript and JavaScript. It takes inspiration from [Preact](https://preactjs.com/guide/v10/signals/), [Vue](https://vuejs.org/guide/extras/reactivity-in-depth.html), and [Solid](https://www.solidjs.com/guides/reactivity). It uses `@vue/reactivity` under the hood and should work with any Vue projects.

Beacon was designed with usage in [Lit](https://lit.dev/) and [`lit-html`](https://github.com/lit/lit/tree/main/packages/lit-html) in mind. Integrations with Lit and `lit-html`, similar to [`@lit-labs/preact-signals`](https://github.com/lit/lit/tree/main/packages/labs/preact-signals), are provided in [`/src/lit`](src/lit).

## Usage

```typescript
import { signal, derived, memo, effect } from 'beacon-signals';

const counter = signal(0);

counter.value = 2;
counter.value += 1;

const todoList = signal<Todo[]>([]);

// Signals are deeply reactive
todoList.value.push({ title: 'One more task', completed: false });

// Automatically updates when `counter` changes:
const isEven = derived(() => counter.value % 2 === 0);
const isEvenComputation = memo(() => {
    if (counter.value % 2 === 0) {
        return someExpensiveComputation()
    }

    return someOtherExpensiveComputation()
})

effect(() => console.log('The counter is:', counter.value));
// The counter is: 3

counter.value = 1;
// The counter is: 1
```

## License

Published under the [MIT License](./LICENSE).
