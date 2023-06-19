import { describe, expect, test } from 'vitest';
import { Observable, effect } from '../src';

describe('observable', () => {
    test('should observe classes', () => {
        @Observable
        class MyClass {
            foo = 'hello';
            bar = 42;
        }

        const instance = new MyClass();

        let cloneFoo = '';
        let cloneBar = 0;

        effect(() => {
            cloneFoo = instance.foo;
            cloneBar = instance.bar;
        });

        instance.foo = 'goodbye';
        expect(cloneFoo).toEqual(instance.foo);

        instance.bar = 29;
        expect(cloneBar).toEqual(instance.bar);
    });
});
