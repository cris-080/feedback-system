import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
    ],
    server: {
        host: '127.0.0.1', // Forces IPv4 to resolve the CORS issue
    }
});

// import { defineConfig } from 'vite';
// import laravel from 'laravel-vite-plugin';
// import react from '@vitejs/plugin-react';

// export default defineConfig({
//     plugins: [
//         laravel({
//             input: 'resources/js/app.jsx',
//             refresh: true,
//         }),
//         react(),
//     ],
//     // ADD THIS SERVER BLOCK:
//     server: {
//         host: '0.0.0.0', // This forces Vite to expose itself to your network
//         cors: true,      // This allows your phone to download the React scripts
//     },
// });