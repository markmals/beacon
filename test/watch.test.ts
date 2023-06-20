import { describe, expect, test } from 'vitest';
import { computed, effect, signal } from '../src';

describe('watchers', () => {
    test('should create and run once, even without dependencies', () => {
        let runs = 0;

        effect(() => {
            runs++;
        });

        expect(runs).toEqual(1);
    });

    test('should schedule on dependencies (signal) change', () => {
        const count = signal(0);
        let runLog: number[] = [];
        effect(() => {
            runLog.push(count());
        });

        expect(runLog).toEqual([0]);

        count.set(1);
        expect(runLog).toEqual([0, 1]);
    });

    test('should not schedule when a previous dependency changes', () => {
        const increment = (value: number) => value + 1;
        const countA = signal(0);
        const countB = signal(100);
        const useCountA = signal(true);

        const runLog: number[] = [];
        effect(() => {
            runLog.push(useCountA() ? countA() : countB());
        });

        expect(runLog).toEqual([0]);

        countB.update(increment);
        // No update expected: updated the wrong signal.
        expect(runLog).toEqual([0]);

        countA.update(increment);
        expect(runLog).toEqual([0, 1]);

        useCountA.set(false);
        expect(runLog).toEqual([0, 1, 101]);

        countA.update(increment);
        // No update expected: updated the wrong signal.
        expect(runLog).toEqual([0, 1, 101]);
    });

    test("should not update dependencies when dependencies don't change", () => {
        const source = signal(0);
        const isEven = computed(() => source() % 2 === 0);
        let updateCounter = 0;
        effect(() => {
            isEven();
            updateCounter++;
        });

        expect(updateCounter).toEqual(1);

        source.set(1);
        expect(updateCounter).toEqual(2);

        source.set(3);
        expect(updateCounter).toEqual(2);

        source.set(4);
        expect(updateCounter).toEqual(3);
    });

    // test('should allow returning cleanup function from the watch logic', () => {
    //     const source = signal(0);

    //     const seenCounterValues: number[] = [];
    //     testingEffect(() => {
    //         seenCounterValues.push(source());

    //         // return a cleanup function that is executed every time an effect re-runs
    //         return () => {
    //             if (seenCounterValues.length === 2) {
    //                 seenCounterValues.length = 0;
    //             }
    //         };
    //     });

    //     flushEffects();
    //     expect(seenCounterValues).toEqual([0]);

    //     source.update(c => c + 1);
    //     flushEffects();
    //     expect(seenCounterValues).toEqual([0, 1]);

    //     source.update(c => c + 1);
    //     flushEffects();
    //     // cleanup (array trim) should have run before executing effect
    //     expect(seenCounterValues).toEqual([2]);
    // });

    // test('should throw an error when reading a signal during the notification phase', () => {
    //     const source = signal(0);
    //     let ranScheduler = false;
    //     const watch = new Watch(
    //         () => {
    //             source();
    //         },
    //         () => {
    //             ranScheduler = true;
    //             expect(() => source()).toThrow();
    //         }
    //     );

    //     // Run the effect manually to initiate dependency tracking.
    //     watch.run();

    //     // Changing the signal will attempt to schedule the effect.
    //     source.set(1);
    //     expect(ranScheduler).toBeTruthy();
    // });
});
