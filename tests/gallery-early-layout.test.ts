import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';
import { GALLERY_MASONRY_BOOTSTRAP } from '../src/lib/prompts/gallery-masonry-bootstrap';

test('inline first-paint layout packs date-ordered cards before the React application is available', () => {
  let resize = () => {}, mutation = () => {};
  class Resize { constructor(callback: () => void) { resize=callback; } observe() {} disconnect() {} }
  class Mutation { constructor(callback: () => void) { mutation=callback; } observe() {} disconnect() {} }
  const card = (id: string, height: number) => ({style:{} as Record<string,string>,height,hasAttribute:()=>true,getAttribute:()=>id,getBoundingClientRect(){return {height:this.height};}});
  const root = {id:'first-paint',clientWidth:1100,style:{} as Record<string,string>,dataset:{} as Record<string,string>,children:[card('0',300),card('1',100),card('2',200),card('3',50)]};
  const browser = {ResizeObserver:Resize,MutationObserver:Mutation,__opGalleryMasonry:undefined as any};
  vm.runInNewContext(GALLERY_MASONRY_BOOTSTRAP,{window:browser,document:{currentScript:{parentElement:root}},ResizeObserver:Resize,MutationObserver:Mutation,Map,WeakSet});
  const snapshot=()=>browser.__opGalleryMasonry[root.id].layout;
  assert.equal(root.dataset.masonryReady,'true');
  assert.deepEqual({...snapshot().positions.get('3')},{x:372,y:116,width:356});
  assert.equal(root.style.height,'300px');
  root.children[0].height=400; resize();
  assert.equal(root.style.height,'400px');
  const before=Array.from(snapshot().positions.entries());
  root.children.push(card('4',120));mutation();
  assert.deepEqual(Array.from(snapshot().positions.entries()).slice(0,4),before);
  assert.deepEqual({...snapshot().positions.get('4')},{x:372,y:182,width:356});
});
