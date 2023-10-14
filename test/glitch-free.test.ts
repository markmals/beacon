import { describe, expect, test } from 'vitest';
import { memo, signal } from '../src';

describe('glitch-free computations', () => {
    test('should recompute only once for diamond dependency graph', () => {
        let fullRecompute = 0;

        const name = signal('John Doe');
        const first = memo(() => name.value.split(' ')[0]);
        const last = memo(() => name.value.split(' ')[1]);
        const full = memo(() => {
            fullRecompute++;
            return `${first.value}/${last.value}`;
        });

        expect(full.value).toEqual('John/Doe');
        expect(fullRecompute).toEqual(1);

        name.value = 'Bob Fisher';
        expect(full.value).toEqual('Bob/Fisher');
        expect(fullRecompute).toEqual(2);
    });

    test('should recompute only once', () => {
        const a = signal('a');
        const b = memo(() => a.value + 'b');
        let cRecompute = 0;
        const c = memo(() => {
            return `${a.value}|${b.value}|${++cRecompute}`;
        });

        expect(c.value).toEqual('a|ab|1');

        a.value = 'A';
        expect(c.value).toEqual('A|Ab|2');
    });
});
