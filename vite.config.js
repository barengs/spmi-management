import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

const isStandaloneBuild = process.env.VERCEL === '1' || process.env.BUILD_TARGET === 'standalone';

export default defineConfig({
    plugins: [
        ...(!isStandaloneBuild ? [
            laravel({
                input: ['resources/css/app.css', 'resources/js/app.jsx'],
                refresh: true,
            }),
        ] : []),
        react(),
        tailwindcss(),
    ],
    build: isStandaloneBuild
        ? {
            outDir: 'dist',
            emptyOutDir: true,
        }
        : undefined,
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
