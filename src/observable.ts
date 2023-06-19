import { reactive } from '@vue/reactivity';

export function Observable<Input extends new (...args: any) => any>(
    value: Input,
    context: ClassDecoratorContext
) {
    if (context.kind === 'class') {
        return class extends value {
            constructor(...args: any) {
                super(...args);
                reactive(this);
            }
        };
    }
    throw Error('@Observable must be applied to a class.');
}
