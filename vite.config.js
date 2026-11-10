import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const devtoolsWellKnown = () => ({
  name: 'devtools-well-known-json',
  configureServer(server) {
    server.middlewares.use(
      '/.well-known/appspecific/com.chrome.devtools.json',
      (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end('{}');
      }
    );
  },
});

export default defineConfig({
  plugins: [react(), devtoolsWellKnown()],
  resolve: {
    alias: {
      'react-native': path.resolve(__dirname, './src/react-native/index.jsx'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
