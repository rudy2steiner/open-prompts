import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
import {DatabaseSync, type SQLInputValue} from 'node:sqlite';
import {SQLiteSyncDialect} from 'drizzle-orm/sqlite-core';
import type {SQL} from 'drizzle-orm';

const require = createRequire(path.join(process.cwd(),'package.json'));
const key = Symbol.for('open-prompts-download-route-test');
const root = process.cwd();
const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64'));
const item = {id:'new',title:'Artwork',description:'Description',prompt:'Exact full prompt',model:'GPT Image 2',tags:[],images:['/local_images/one.png']};
type Fixture = {owner: string | null; paid: string[]; owned: Set<string>; items: typeof item[]; db: unknown; beforeWrite?: ()=>void; image: ()=>Promise<{bytes:Uint8Array;contentType:string;extension:string}>};
let compiled: Promise<{GET: (request: Request)=>Promise<Response>; POST: (request: Request)=>Promise<Response>}>;
function handlers() {
  return compiled ??= (async()=>{
    const state = 'globalThis[Symbol.for("open-prompts-download-route-test")]';
    const mocks: Record<string,string> = {
      '~/db/client': `export const getDb=()=>${state}.db`,
      '~/lib/auth/session': `export async function getAuthSession(){return ${state}.owner?{user:{id:${state}.owner}}:null}`,
      '~/lib/billing/identity': 'export async function settleLoginLedger(){}',
      '~/lib/prompts/get-prompt-gallery': `export async function getPromptGallery(){return ${state}.items}`,
      'next-intl/server': 'export async function getMessages(){return {}}',
      '~/lib/prompts/prompt-download': `export {createPromptDownload,downloadCatalogItems} from ${JSON.stringify(path.join(root,'src/lib/prompts/prompt-download.ts'))}; export const loadPromptDownloadImage=()=>${state}.image()`,
    };
    const result = await build({absWorkingDir:root,entryPoints:['src/app/[locale]/api/prompts/download/route.ts'],platform:'node',format:'cjs',packages:'external',bundle:true,write:false,plugins:[{name:'external-boundaries',setup(builder){
      builder.onResolve({filter:/.*/},args=>mocks[args.path]?{path:args.path,namespace:'fixture'}:undefined);
      builder.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:mocks[args.path]!,loader:'js',resolveDir:root}));
    }}]});
    const module = {exports:{}};
    new Function('require','module','exports',result.outputFiles[0]!.text)(require,module,module.exports);
    return module.exports as {GET:(request:Request)=>Promise<Response>;POST:(request:Request)=>Promise<Response>};
  })();
}
function fixture(overrides: Partial<Fixture> = {}) {
  const state: Fixture = {owner:'owner',paid:['one-time'],owned:new Set(),items:[item],image:async()=>({bytes:png,contentType:'image/png',extension:'png'}),db:null,...overrides};
  state.db = {
    select(fields: Record<string,unknown>) {
      const rows = 'productId' in fields ? state.paid.map(productId=>({productId})) : 'promptId' in fields ? Array.from(state.owned).map(promptId=>({promptId})) : [];
      const query = {from:()=>query,where:()=>query,orderBy:()=>query,get:async()=>undefined,then:(resolve:(rows:unknown[])=>unknown)=>Promise.resolve(rows).then(resolve)};
      return query;
    },
    insert() {let rows: {promptId:string}[]=[];return {values(value:typeof rows){rows=value;return {async onConflictDoNothing(){state.beforeWrite?.(); if(rows.some(row=>row.promptId==='blocked')) throw new Error('write failure'); for(const row of rows) state.owned.add(row.promptId);}}}};},
    async run(statement: SQL) {
      state.beforeWrite?.();
      const database = new DatabaseSync(':memory:');
      try {
        database.exec('CREATE TABLE p_prompt_downloads (owner_id TEXT NOT NULL, prompt_id TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (owner_id,prompt_id)); CREATE TRIGGER reject_blocked BEFORE INSERT ON p_prompt_downloads WHEN NEW.prompt_id = \'blocked\' BEGIN SELECT RAISE(ABORT,\'write failure\'); END;');
        for (const promptId of Array.from(state.owned)) database.prepare('INSERT INTO p_prompt_downloads VALUES (?,?,0)').run(state.owner!,promptId);
        const query = new SQLiteSyncDialect().sqlToQuery(statement);
        const result = database.prepare(query.sql).run(...query.params as SQLInputValue[]);
        state.owned = new Set((database.prepare('SELECT prompt_id FROM p_prompt_downloads WHERE owner_id=?').all(state.owner!) as {prompt_id:string}[]).map(row=>row.prompt_id));
        return {meta:{changes:Number(result.changes)}};
      } finally {database.close();}
    },
  };
  (globalThis as Record<symbol,unknown>)[key] = state;
  return state;
}
const request = (body: unknown) => new Request('https://www.open-prompts.com/api/prompts/download',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});

test('download route requires an entitled user and exposes image previews only after the same entitlement check', async()=>{
  const {GET,POST} = await handlers();
  fixture({owner:null});
  assert.equal((await GET(new Request('https://www.open-prompts.com/api/prompts/download'))).status,402);
  assert.equal((await POST(request({ids:['new'],format:'zip'}))).status,402);
  fixture({paid:[]});
  assert.equal((await POST(request({ids:['new'],format:'zip'}))).status,402);
  fixture();
  const catalog=await (await GET(new Request('https://www.open-prompts.com/api/prompts/download'))).json();
  assert.deepEqual(catalog.items,[{id:'new',title:'Artwork',model:'GPT Image 2',previewSrc:'/local_images/one.png',imageCount:1}]);
});

test('download route rejects unsupported formats and excess new selections without silently truncating them', async()=>{
  const {POST} = await handlers();
  const state=fixture();
  assert.equal((await POST(request({ids:['new'],format:'json'}))).status,400);
  state.owned=new Set(Array.from({length:500},(_,i)=>`owned-${i}`));
  assert.equal((await POST(request({ids:['new'],format:'zip'}))).status,403);
  assert.equal(state.owned.size,500);
});

test('real download route records acquisition before releasing the complete archive and preserves free redownloads', async()=>{
  const {POST} = await handlers();
  const state=fixture();
  const response=await POST(request({ids:['new'],format:'zip'}));
  assert.equal(response.headers.get('content-disposition'),'attachment; filename="open-prompts.zip"');
  assert.deepEqual(Array.from(state.owned),['new']);
  await response.arrayBuffer();
  assert.deepEqual(Array.from(state.owned),['new']);
  const repeat=await POST(request({ids:['new'],format:'zip'}));
  assert.equal(repeat.headers.get('x-download-new'),'0');
  await repeat.arrayBuffer();
  assert.equal(state.owned.size,1);
});

test('link-only downloads acquire the same quota without fetching original image bytes', async()=>{
  const {POST} = await handlers();
  const state = fixture({image: async()=>{assert.fail('Link-only route must not fetch images');}});
  const response = await POST(request({ids:['new'],format:'html',imageMode:'links'}));
  assert.equal(response.status,200);
  const html = await response.text();
  const data = JSON.parse(html.match(/<script id="prompt-download-data" type="application\/json">([\s\S]*?)<\/script>/)![1]!);
  assert.equal(data.imageMode,'links');
  assert.deepEqual(data.items[0].images,['https://www.open-prompts.com/local_images/one.png']);
  assert.equal(response.headers.get('x-download-new'),'1');
  assert.deepEqual(Array.from(state.owned),['new']);
  const repeat = await POST(request({ids:['new'],format:'zip',imageMode:'links'}));
  assert.equal(repeat.status,200);
  assert.equal(repeat.headers.get('x-download-new'),'0');
});

test('download route rejects unknown image modes rather than silently fetching originals', async()=>{
  const {POST} = await handlers();
  const state = fixture({image: async()=>{assert.fail('Invalid image mode must not fetch images');}});
  const response = await POST(request({ids:['new'],format:'zip',imageMode:'unknown'}));
  assert.equal(response.status,400);
  assert.equal(state.owned.size,0);
});

test('real download route leaves fresh quota unchanged when an original image fails', async()=>{
  const {POST} = await handlers();
  const state=fixture({image:async()=>{throw new Error('original image unavailable');}});
  const response=await POST(request({ids:['new'],format:'zip'}));
  assert.equal(response.status,502);
  assert.equal(state.owned.size,0);
});

test('all prompt acquisitions roll back together if the archive quota write fails', async()=>{
  const {POST} = await handlers();
  const ids = [...Array.from({length:40},(_,i)=>`fresh-${i}`),'blocked'];
  const state=fixture({items:ids.map(id=>({...item,id,images:[]}))});
  const response=await POST(request({ids,format:'zip'}));
  assert.equal(response.status,502);
  assert.equal(state.owned.size,0);
});

test('the final quota check and acquisition cannot race a competing download', async()=>{
  const {POST} = await handlers();
  const state=fixture({owned:new Set(Array.from({length:499},(_,i)=>`owned-${i}`))});
  state.beforeWrite=()=>{state.owned.add('competing-download');};
  const response=await POST(request({ids:['new'],format:'zip'}));
  assert.equal(response.status,403);
  assert.equal(state.owned.size,500);
  assert.equal(state.owned.has('new'),false);
});

test('quota consumed elsewhere while images are loading is checked again before completing the archive', async()=>{
  const {POST} = await handlers();
  const state=fixture({owned:new Set(Array.from({length:499},(_,i)=>`owned-${i}`))});
  state.image=async()=>{state.owned.add('another-download');return {bytes:png,contentType:'image/png',extension:'png'};};
  const response=await POST(request({ids:['new'],format:'zip'}));
  assert.equal(response.status,403);
  assert.equal((await response.json()).error,'download_quota');
  assert.equal(state.owned.size,500);
  assert.equal(state.owned.has('new'),false);
});
