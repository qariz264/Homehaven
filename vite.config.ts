import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const paystackPublicKey = env.VITE_PAYSTACK_PUBLIC_KEY || env.PAYSTACK_PUBLIC_KEY || '';

  return {
    plugins: [react(), tailwindcss()],
    envPrefix: ['VITE_', 'PAYSTACK_'],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_PAYSTACK_PUBLIC_KEY': JSON.stringify(paystackPublicKey),
      'import.meta.env.PAYSTACK_PUBLIC_KEY': JSON.stringify(paystackPublicKey),
      'process.env.PAYSTACK_PUBLIC_KEY': JSON.stringify(paystackPublicKey),
      'process.env.VITE_PAYSTACK_PUBLIC_KEY': JSON.stringify(paystackPublicKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
