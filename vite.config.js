import { defineConfig } from 'vite';
import path from 'node:path';
export default defineConfig({resolve:{alias:{'.capabilities':path.resolve(process.cwd(),'.capabilities')}},server:{host:'0.0.0.0',port:61004,strictPort:true}});
