import { describe, expect, test } from 'vitest';
import { memo, signal } from '../src';

describe('glitch-free computations', () => {
    test('should recompute only once for diamond dependency graph', () => {
        let fullRecompute = 0;

        const name = signal('John Doe');
        const first = memo(() => name().split(' ')[0]);
        const last = memo(() => name().split(' ')[1]);
        const full = memo(() => {
            fullRecompute++;
            return `${first()}/${last()}`;
        });

        expect(full()).toEqual('John/Doe');
        expect(fullRecompute).toEqual(1);

        name.set('Bob Fisher');
        expect(full()).toEqual('Bob/Fisher');
        expect(fullRecompute).toEqual(2);
    });

    test('should recompute only once', () => {
        const a = signal('a');
        const b = memo(() => a() + 'b');
        let cRecompute = 0;
        const c = memo(() => {
            return `${a()}|${b()}|${++cRecompute}`;
        });

        expect(c()).toEqual('a|ab|1');

        a.set('A');
        expect(c()).toEqual('A|Ab|2');
    });
});
