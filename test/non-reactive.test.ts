import { describe, expect, test } from 'vitest';
import { effect, memo, signal, untrack } from '../src';

describe('non-reactive reads', () => {
    test('should read the latest value from signal', () => {
        const counter = signal(0);

        expect(untrack(() => counter.value)).toEqual(0);

        counter.value = 1;
        expect(untrack(() => counter.value)).toEqual(1);
    });

    test('should not add dependencies to computed when reading a value from a signal', () => {
        const counter = signal(0);
        const double = memo(() => untrack(() => counter.value) * 2);

        expect(double.value).toEqual(0);

        counter.value = 2;
        expect(double.value).toEqual(0);
    });

    test('should refresh computed value if stale and read non-reactively ', () => {
        const counter = signal(0);
        const double = memo(() => counter.value * 2);

        expect(untrack(() => double.value)).toEqual(0);

        counter.value = 2;
        expect(untrack(() => double.value)).toEqual(4);
    });

    test('should not make surrounding effect depend on the signal', () => {
        const s = signal(1);

        const runLog: number[] = [];
        effect(() => {
            runLog.push(untrack(() => s.value));
        });

        // an effect will run at least once
        expect(runLog).toEqual([1]);

        // subsequent signal changes should not trigger effects as signal is untracked
        s.value = 2;
        expect(runLog).toEqual([1]);
    });

    test('should schedule on dependencies (computed) change', () => {
        const count = signal(0);
        const double = memo(() => count.value * 2);

        let runLog: number[] = [];
        effect(() => {
            runLog.push(double.value);
        });

        expect(runLog).toEqual([0]);

        count.value = 1;
        expect(runLog).toEqual([0, 2]);
    });

    test('should non-reactively read all signals accessed inside untrack', () => {
        const first = signal('John');
        const last = signal('Doe');

        let runLog: string[] = [];
        effect(() => {
            untrack(() => runLog.push(`${first.value} ${last.value}`));
        });

        // effects run at least once
        expect(runLog).toEqual(['John Doe']);

        // change one of the signals - should not update as not read reactively
        first.value = 'Patricia';
        expect(runLog).toEqual(['John Doe']);

        // change one of the signals - should not update as not read reactively
        last.value = 'Garcia';
        expect(runLog).toEqual(['John Doe']);
    });
});
