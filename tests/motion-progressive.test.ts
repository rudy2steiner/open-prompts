import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ProgressiveMotionVideo } from '../src/app/[locale]/motion-prompts/ProgressiveMotionVideo';

class Player extends EventTarget {
  readyState = 4; videoWidth = 320; currentTime = 1; duration = 20;
  muted = true; volume = 1; playbackRate = 1; paused = false;
  pauses = 0; plays = 0; frames = 0; loads = 0;
  callback?: VideoFrameRequestCallback;
  play() { this.paused = false; this.plays++; return Promise.resolve(); }
  pause() { this.paused = true; this.pauses++; }
  load() { this.loads++; }
  removeAttribute() {}
  requestVideoFrameCallback(callback: VideoFrameRequestCallback) { this.callback = callback; return ++this.frames; }
  cancelVideoFrameCallback() { this.callback = undefined; }
  frame(time = this.currentTime) { this.callback?.(0, { mediaTime: time } as VideoFrameCallbackMetadata); }
}
function setup() {
  const short = new Player(), full = new Player(); full.paused = true;
  let renderer!: ReactTestRenderer;
  act(() => { renderer = create(createElement(ProgressiveMotionVideo, {
    preview: '/short.mp4', original: '/original.mp4', poster: '/poster.webp', label: 'Demo', image: createElement('img', { src: '/poster.webp' }),
  }), { createNodeMock: element => element.type === 'video' ? element.props.className === 'motion-short-video' ? short : full : null }); });
  const videos = () => renderer.root.findAllByType('video');
  const startShort = () => { act(() => videos()[0].props.onPlaying()); act(() => short.frame()); };
  const promote = () => { startShort(); act(() => videos()[1].props.onCanPlay()); act(() => videos()[1].props.onPlaying()); act(() => full.frame()); };
  return { short, full, renderer, videos, startShort, promote };
}

test('detail does not request the original until short preview has a real frame', () => {
  const x = setup();
  assert.equal(x.videos()[1].props.src, undefined);
  act(() => x.videos()[0].props.onPlaying());
  assert.equal(x.videos()[1].props.src, undefined);
  act(() => x.short.frame());
  assert.equal(x.videos()[1].props.src, '/original.mp4');
  act(() => x.renderer.unmount());
});

test('full-video pause/play and buffer recovery do not repeat the handoff or pause it', () => {
  const x = setup(); x.promote();
  assert.equal(x.videos()[1].props.style.visibility, 'visible');
  assert.equal(x.short.paused, true);
  const pauses = x.full.pauses, frames = x.full.frames;
  act(() => x.videos()[1].props.onPlaying());
  act(() => x.videos()[1].props.onPlaying());
  x.full.frame();
  assert.equal(x.full.pauses, pauses);
  assert.equal(x.full.frames, frames);
  assert.equal(x.videos()[1].props.style.visibility, 'visible');
  act(() => x.renderer.unmount());
});

test('a paused preview is not hijacked, and seeking updates the full-video handoff', () => {
  const x = setup(); x.startShort();
  x.short.paused = true;
  act(() => x.videos()[1].props.onCanPlay());
  assert.equal(x.full.plays, 0);
  x.short.paused = false;
  act(() => x.videos()[0].props.onPlaying());
  assert.equal(x.full.plays, 1);
  act(() => x.videos()[0].props.onSeeking());
  x.short.currentTime = 4; x.short.playbackRate = 2;
  act(() => x.videos()[0].props.onSeeked());
  assert.equal(x.full.currentTime, 4);
  assert.equal(x.full.playbackRate, 2);
  act(() => x.renderer.unmount());
  assert.ok(x.short.loads > 0 && x.full.loads > 0);
});

test('original load failure keeps the decoded short preview visible', () => {
  const x = setup(); x.startShort();
  act(() => x.videos()[1].props.onError());
  assert.equal(x.videos()[0].props.style.visibility, 'visible');
  assert.equal(x.videos()[1].props.style.visibility, 'hidden');
  assert.equal(x.videos()[1].props.src, undefined);
  act(() => x.renderer.unmount());
});
