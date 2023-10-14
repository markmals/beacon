import { describe, expect, test } from 'vitest';
import { derived, signal } from '../src';

describe('signals', () => {
    test('should be a getter which reflect the set value', () => {
        const state = signal(false);
        expect(state.value).toBeFalsy();
        state.value = true;
        expect(state.value).toBeTruthy();
    });

    test('should accept update function to set new value based on the previous one', () => {
        const counter = signal(0);
        expect(counter.value).toEqual(0);

        counter.value += 1;
        expect(counter.value).toEqual(1);
    });

    test('should have mutate function for mutable, out of bound updates', () => {
        const state = signal<string[]>(['a']);
        const computed = derived(() => state.value.join(':'));

        expect(computed.value).toEqual('a');

        state.value.push('b');
        expect(computed.value).toEqual('a:b');
    });

    test('should consider objects as non-equal with the default equality function', () => {
        let stateValue: unknown = {};
        const state = signal(stateValue);
        let computeCount = 0;
        const computed = derived(() => `${typeof state.value}:${++computeCount}`);
        expect(computed.value).toEqual('object:1');

        // reset signal value to the same object instance, expect change notification
        state.value = stateValue;
        expect(computed.value).toEqual('object:2');

        // reset signal value to a different object instance, expect change notification
        stateValue = {};
        state.value = stateValue;
        expect(computed.value).toEqual('object:3');

        // reset signal value to a different object type, expect change notification
        stateValue = [];
        state.value = stateValue;
        expect(computed.value).toEqual('object:4');

        // reset signal value to the same array instance, expect change notification
        state.value = stateValue;
        expect(computed.value).toEqual('object:5');
    });

    // TODO: Deep reactivity tests
});
