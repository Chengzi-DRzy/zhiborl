import { defineConfig } from 'vite';
import path from 'node:path';

// 本地预览（npm run dev）时，/api 转发到线上服务器读取真实排班（只读）。
// 在公司内网也可以改成：ZHIBORL_API=http://192.168.2.249:8850 npm run dev
const api = process.env.ZHIBORL_API || 'https://zhibo.shueho.com:8443';

export default defineConfig({
  base: './',
  resolve: { alias: { '.capabilities': path.resolve(process.cwd(), '.capabilities') } },
  server: {
    host: '0.0.0.0',
    port: 61004,
    strictPort: true,
    proxy: { '/api': { target: api, changeOrigin: true } },
  },
});
