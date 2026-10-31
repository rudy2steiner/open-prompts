import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { waitForMotionFrame } from '../src/lib/motion/first-frame';

class FakeVideo extends EventTarget {
  readyState = 0;
  currentTime = 0;
  videoWidth = 320;
  callback?: VideoFrameRequestCallback;
  requestVideoFrameCallback(callback: VideoFrameRequestCallback) { this.callback = callback; return 1; }
  cancelVideoFrameCallback() { this.callback = undefined; }
  frame(time: number) { this.callback?.(0, { mediaTime: time } as VideoFrameCallbackMetadata); }
}

test('playing without a submitted frame must not remove the poster', () => {
  const video = new FakeVideo();
  let ready = 0;
  waitForMotionFrame(video as unknown as HTMLVideoElement, () => ready++);
  video.dispatchEvent(new Event('playing'));
  video.frame(0);
  assert.equal(ready, 0);
  video.readyState = 2;
  video.frame(0);
  assert.equal(ready, 0);
  video.frame(.1);
  assert.equal(ready, 1);
  video.frame(.2);
  assert.equal(ready, 1);
});

test('unmount cancels a pending first-frame handoff', () => {
  const video = new FakeVideo();
  let ready = false;
  const stop = waitForMotionFrame(video as unknown as HTMLVideoElement, () => { ready = true; });
  stop();
  video.readyState = 4;
  video.frame(.1);
  assert.equal(ready, false);
});

test('older browsers require real time progress and decoded data', () => {
  const video = new EventTarget() as EventTarget & { readyState: number; currentTime: number; videoWidth: number };
  Object.assign(video, { readyState: 0, currentTime: 0, videoWidth: 320 });
  let ready = false;
  waitForMotionFrame(video as unknown as HTMLVideoElement, () => { ready = true; });
  video.readyState = 2;
  video.dispatchEvent(new Event('timeupdate'));
  assert.equal(ready, false);
  video.currentTime = .1;
  video.dispatchEvent(new Event('timeupdate'));
  assert.equal(ready, true);
});
