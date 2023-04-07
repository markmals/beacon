import { Watch } from '../src';

let queue = new Set<Watch>();

/**
 * A wrapper around `Watch` that emulates the `effect` API and allows for more streamlined testing.
 */
export function testingEffect(effectFn: () => void): void {
    const watch = new Watch(effectFn, queue.add.bind(queue));

    // Effects start dirty.
    watch.notify();
}

export function flushEffects(): void {
    for (const watch of queue) {
        queue.delete(watch);
        watch.run();
    }
}

export function resetEffects(): void {
    queue.clear();
}
