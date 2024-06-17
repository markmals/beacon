import { describe, expect, it } from 'vitest';
import { effect, signal } from '../src';

describe('side effects', () => {
    it('should create and run once, even without dependencies', () => {
        let runs = 0;
        effect(() => runs++);
        expect(runs).toEqual(1);
    });

    it('should schedule on dependencies (signal) change', () => {
        const count = signal(0);
        let runLog: number[] = [];
        effect(() => runLog.push(count()));

        expect(runLog).toEqual([0]);

        count.set(1);
        expect(runLog).toEqual([0, 1]);
    });

    it('should not schedule when a previous dependency changes', () => {
        const countA = signal(0);
        const countB = signal(100);
        const useCountA = signal(true);

        const runLog: number[] = [];
        effect(() => runLog.push(useCountA() ? countA() : countB()));

        expect(runLog).toEqual([0]);

        countB.update(v => v + 1);
        // No update expected: updated the wrong signal.
        expect(runLog).toEqual([0]);

        countA.update(v => v + 1);
        expect(runLog).toEqual([0, 1]);

        useCountA.set(false);
        expect(runLog).toEqual([0, 1, 101]);

        countA.update(v => v + 1);
        // No update expected: updated the wrong signal.
        expect(runLog).toEqual([0, 1, 101]);
    });

    // test("should not update dependencies when dependencies don't change", () => {
    //     const source = signal(0);
    //     const isEven = memo(() => source.value % 2 === 0);
    //     let updateCounter = 0;
    //     effect(() => {
    //         console.log(isEven.value);
    //         updateCounter++;
    //     });

    //     expect(updateCounter).toEqual(1);

    //     source.value = 1;
    //     expect(updateCounter).toEqual(2);

    //     source.value = 3;
    //     expect(updateCounter).toEqual(2);

    //     source.value = 4;
    //     expect(updateCounter).toEqual(3);
    // });

    // test('should allow returning cleanup function from the watch logic', () => {
    //     const source = signal(0);

    //     const seenCounterValues: number[] = [];
    //     effect(() => {
    //         seenCounterValues.push(source.value);

    //         // return a cleanup function that is executed every time an effect re-runs
    //         return () => {
    //             if (seenCounterValues.length === 2) {
    //                 seenCounterValues.length = 0;
    //             }
    //         };
    //     });

    //     expect(seenCounterValues).toEqual([0]);

    //     source.value += 1;
    //     expect(seenCounterValues).toEqual([0, 1]);

    //     source.value += 1;
    //     expect(seenCounterValues).toEqual([2]);
    // });
});
