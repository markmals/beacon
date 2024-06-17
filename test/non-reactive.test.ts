import { describe, expect, test } from 'vitest';
import { effect, memo, signal, untrack } from '../src';

describe('non-reactive reads', () => {
    test('should read the latest value from signal', () => {
        const counter = signal(0);

        expect(untrack(() => counter())).toEqual(0);

        counter.set(1);
        expect(untrack(() => counter())).toEqual(1);
    });

    test('should not add dependencies to computed when reading a value from a signal', () => {
        const counter = signal(0);
        const double = memo(() => untrack(() => counter()) * 2);

        expect(double()).toEqual(0);

        counter.set(2);
        expect(double()).toEqual(0);
    });

    test('should refresh computed value if stale and read non-reactively ', () => {
        const counter = signal(0);
        const double = memo(() => counter() * 2);

        expect(untrack(() => double())).toEqual(0);

        counter.set(2);
        expect(untrack(() => double())).toEqual(4);
    });

    test('should not make surrounding effect depend on the signal', () => {
        const s = signal(1);

        const runLog: number[] = [];
        effect(() => {
            runLog.push(untrack(() => s()));
        });

        // an effect will run at least once
        expect(runLog).toEqual([1]);

        // subsequent signal changes should not trigger effects as signal is untracked
        s.set(2);
        expect(runLog).toEqual([1]);
    });

    test('should schedule on dependencies (computed) change', () => {
        const count = signal(0);
        const double = memo(() => count() * 2);

        let runLog: number[] = [];
        effect(() => runLog.push(double()));

        expect(runLog).toEqual([0]);

        count.set(1);
        expect(runLog).toEqual([0, 2]);
    });

    test('should non-reactively read all signals accessed inside untrack', () => {
        const first = signal('John');
        const last = signal('Doe');

        let runLog: string[] = [];
        effect(() => {
            untrack(() => runLog.push(`${first()} ${last()}`));
        });

        // effects run at least once
        expect(runLog).toEqual(['John Doe']);

        // change one of the signals - should not update as not read reactively
        first.set('Patricia');
        expect(runLog).toEqual(['John Doe']);

        // change one of the signals - should not update as not read reactively
        last.set('Garcia');
        expect(runLog).toEqual(['John Doe']);
    });
});
