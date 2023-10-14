import typescript from '@rollup/plugin-typescript';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [typescript()],
    test: {
        environment: 'jsdom',
    },
});
