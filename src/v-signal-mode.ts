import type { Directive } from 'vue';
import { SettableSignal, effect } from './index.js';

export default {
    created(element, binding) {
        effect(() => (element.value = binding.value()));

        element.addEventListener('input', event =>
            binding.value.set((event.target as HTMLInputElement).value)
        );
    },
} satisfies Directive<HTMLInputElement, SettableSignal<string>>;
