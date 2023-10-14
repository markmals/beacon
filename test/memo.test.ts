import { describe, expect, test } from 'vitest';
import { memo, signal } from '../src';

describe('memo', () => {
    test('should create memo', () => {
        const counter = signal(0);

        let memoRunCount = 0;
        const double = memo(() => `${counter.value * 2}:${++memoRunCount}`);

        expect(double.value).toEqual('0:1');

        counter.value = 1;
        expect(double.value).toEqual('2:2');
        expect(double.value).toEqual('2:2');

        counter.value = 2;
        expect(double.value).toEqual('4:3');
        expect(double.value).toEqual('4:3');
    });

    test('should not re-compute if there are no dependencies', () => {
        let tick = 0;
        const c = memo(() => ++tick);

        expect(c.value).toEqual(1);
        expect(c.value).toEqual(1);
    });

    test('should not re-compute if the dependency is a primitive value and the value did not change', () => {
        const counter = signal(0);

        let memoRunCount = 0;
        const double = memo(() => `${counter.value * 2}:${++memoRunCount}`);

        expect(double.value).toEqual('0:1');

        counter.value = 0;
        expect(double.value).toEqual('0:1');
    });

    test('should chain memo', () => {
        const name = signal('abc');
        const reverse = memo(() => name.value.split('').reverse().join(''));
        const upper = memo(() => reverse.value.toUpperCase());

        expect(upper.value).toEqual('CBA');

        name.value = 'foo';
        expect(upper.value).toEqual('OOF');
    });

    test('should evaluate memo only when subscribing', () => {
        const name = signal('John');
        const show = signal(true);

        let computeCount = 0;
        const displayName = memo(
            () => `${show.value ? name.value : 'anonymous'}:${++computeCount}`,
        );

        expect(displayName.value).toEqual('John:1');

        show.value = false;
        expect(displayName.value).toEqual('anonymous:2');

        name.value = 'Bob';
        expect(displayName.value).toEqual('anonymous:2');
    });

    // test('should not mark dirty memo signals that are dirty already', () => {
    //     const source = signal('a');
    //     const derived = memo(() => source.value.toUpperCase());

    //     let watchCount = 0;
    //     effect(() => {
    //         derived.value;
    //         watchCount++;
    //     });

    //     expect(watchCount).toEqual(0);

    //     // change signal, mark downstream dependencies dirty
    //     source.value = 'b';
    //     expect(watchCount).toEqual(1);

    //     // change signal again, downstream dependencies should be dirty already and not marked again
    //     source.value = 'c';
    //     expect(watchCount).toEqual(1);

    //     // expecting another notification at this point
    //     source.value = 'd';
    //     expect(watchCount).toEqual(2);
    // });

    // test('should disallow writing to signals within computeds', () => {
    //     const source = signal(0);
    //     const illegal = memo(() => {
    //         source.value = 1;
    //         return 0;
    //     });

    //     expect(illegal).toThrow();
    // });
});
