const path = require('node:path');
const fs = require('node:fs/promises');
const esbuild = require('esbuild');
const postcss = require('postcss');
const tailwind = require('tailwindcss');
const autoprefixer = require('autoprefixer');
const root = path.resolve(__dirname, '..');

async function build() {
  const result = await esbuild.build({
    absWorkingDir: root,
    entryPoints: ['src/components/prompt-gallery/PromptDownloadGallery.tsx'],
    bundle: true, write: false, minify: true, platform: 'browser', format: 'iife', jsx: 'automatic',
    define: {'process.env.NODE_ENV': '"production"'},
    loader: {'.css': 'empty'},
    plugins: [{name: 'offline-next-boundaries', setup(build) {
      build.onResolve({filter: /^next\/(image|link|navigation)$/}, args => ({path: args.path, namespace: 'offline'}));
      build.onLoad({filter: /.*/, namespace: 'offline'}, args => {
        if (args.path === 'next/navigation') return {contents: 'export function useRouter(){return {push(href){location.hash=href}}}', loader: 'js'};
        if (args.path === 'next/link') return {contents: 'import React from "react"; export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>}',loader:'jsx',resolveDir:root};
        return {contents: 'import React from "react"; export default function Image({fill,priority,unoptimized,style,width,height,...props}){return <img {...props} width={fill?undefined:width} height={fill?undefined:height} loading={priority?"eager":"lazy"} style={fill?{position:"absolute",inset:0,width:"100%",height:"100%",...style}:style}/>} ',loader:'jsx',resolveDir:root};
      });
    }}],
  });
  const layout = await fs.readFile(path.join(root, 'src/app/[locale]/layout.tsx'), 'utf8');
  const tokenStart = layout.indexOf(':root{');
  const tokenEnd = layout.indexOf('html,body{', tokenStart);
  if (tokenStart < 0 || tokenEnd < 0) throw new Error('Site theme tokens not found');
  const sheets = await Promise.all(['src/app/styles.css', 'src/app/[locale]/image-prompts/gallery-page.css', 'src/components/prompt-gallery/prompt-gallery-viewer.css'].map(file => fs.readFile(path.join(root, file), 'utf8')));
  const css = await postcss([tailwind({config:path.join(root,'tailwind.config.ts')}), autoprefixer]).process(sheets.join('\n'), {from:path.join(root,'src/app/styles.css')});
  const assets = {js:result.outputFiles[0].text, css:css.css + '\n' + layout.slice(tokenStart, tokenEnd) + '\nhtml,body{margin:0;background:var(--bg);color:var(--text)}'};
  await fs.writeFile(path.join(root,'src/lib/prompts/download-assets.json'), JSON.stringify(assets));
  console.log(`Offline gallery assets: ${Math.round(Buffer.byteLength(assets.js)/1024)} KB JS, ${Math.round(Buffer.byteLength(assets.css)/1024)} KB CSS`);
}
build().catch(error => {console.error(error); process.exitCode=1;});
