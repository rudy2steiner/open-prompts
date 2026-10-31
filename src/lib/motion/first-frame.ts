// playing 只表示开始播放流程；必须有实际提交的视频帧，才能移除封面。
export function waitForMotionFrame(video: HTMLVideoElement, ready: () => void) {
  let cancelled = false;
  let frame: number | undefined;
  const finish = () => {
    if (cancelled) return;
    cancelled = true;
    video.removeEventListener('timeupdate', check);
    ready();
  };
  const check = () => {
    if (video.readyState >= 2 && video.videoWidth > 0 && video.currentTime > 0.05) finish();
  };
  if (typeof video.requestVideoFrameCallback === 'function') {
    const watch: VideoFrameRequestCallback = (_now, metadata) => {
      if (cancelled) return;
      if (video.readyState >= 2 && metadata.mediaTime > 0.05) finish();
      else frame = video.requestVideoFrameCallback(watch);
    };
    frame = video.requestVideoFrameCallback(watch);
  } else {
    video.addEventListener('timeupdate', check);
    check();
  }
  return () => {
    cancelled = true;
    if (frame !== undefined) video.cancelVideoFrameCallback?.(frame);
    video.removeEventListener('timeupdate', check);
  };
}
