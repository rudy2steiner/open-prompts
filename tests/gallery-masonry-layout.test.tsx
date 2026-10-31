import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { Profiler } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { PromptGalleryMasonry } from '../src/components/prompt-gallery/PromptGalleryMasonry';

const ids = ['0', '1', '2', '3'];
const itemKey = (id: string) => id;
const renderItem = (id: string) => <article>{id}</article>;
test('gallery uses three columns at medium desktop width and fills the shortest column', () => {
  const original = global.ResizeObserver;
  let notify = () => {};
  global.ResizeObserver = class { constructor(callback: () => void) { notify = callback; } observe() {} disconnect() {} unobserve() {} } as unknown as typeof ResizeObserver;
  let commits = 0;
  let tree!: ReactTestRenderer;
  try {
    act(() => { tree = create(<Profiler id="gallery" onRender={() => commits++}><PromptGalleryMasonry items={ids} itemKey={itemKey} renderItem={renderItem} /></Profiler>, {createNodeMock: node => node.props.className === 'gallery-masonry-surface' ? {clientWidth: 1100, dataset:{}} : {getBoundingClientRect: () => ({height: [300, 100, 200, 50][Number(node.props['data-gallery-item'])]})}}); });
    const cards = tree.root.findAll(node => node.type === 'div' && node.props['data-gallery-item'] !== undefined);
    assert.equal(cards.length, 4);
    assert.equal(new Set(cards.slice(0, 3).map(card => card.props.style.transform)).size, 3);
    assert.ok(cards[3].props.style.transform.includes('372px, 116px'), 'fourth card follows the shortest, second column');
    const before = commits;
    act(() => notify());
    assert.equal(commits, before, 'unchanged measurements must not rerender and restart the observer');
  } finally { act(() => tree?.unmount()); global.ResizeObserver = original; }
});
