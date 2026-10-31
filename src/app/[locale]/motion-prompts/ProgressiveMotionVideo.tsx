'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { waitForMotionFrame } from '~/lib/motion/first-frame';

type Props = { preview: string; original: string; poster: string | null; label: string; image: ReactNode };

// 短预览先响应；原片解码并提交画面后才交接，两个播放器不替换 src。
export function ProgressiveMotionVideo({ preview, original, poster, label, image }: Props) {
  const short = useRef<HTMLVideoElement>(null);
  const full = useRef<HTMLVideoElement>(null);
  const [requested, setRequested] = useState(false);
  const [shortReady, setShortReady] = useState(false);
  const [fullReady, setFullReady] = useState(false);
  const [shortFailed, setShortFailed] = useState(false);
  const [fullFailed, setFullFailed] = useState(false);
  const preparing = useRef(false);
  const stopShortFrame = useRef<() => void>(() => {});
  const stopFullFrame = useRef<() => void>(() => {});

  useEffect(() => {
    const players = [short.current, full.current];
    return () => {
      stopShortFrame.current();
      stopFullFrame.current();
      for (const player of players) { player?.pause(); player?.removeAttribute('src'); player?.load(); }
    };
  }, []);

  const prepareFull = () => {
    const player = full.current;
    const current = short.current;
    if (!player || fullFailed || fullReady || preparing.current || player.readyState < 2 || (!shortFailed && current?.paused)) return;
    preparing.current = true;
    const time = current?.currentTime || 0;
    player.currentTime = Number.isFinite(player.duration) ? Math.min(time, Math.max(0, player.duration - .1)) : time;
    player.muted = current?.muted ?? true;
    player.volume = current?.volume ?? 1;
    player.playbackRate = current?.playbackRate ?? 1;
    void player.play().catch(() => { preparing.current = false; });
  };

  return <div className="motion-progressive-video">
    <video ref={short} className="motion-short-video" src={preview} poster={poster || undefined}
      style={{ visibility: fullReady || shortFailed ? 'hidden' : 'visible' }}
      data-motion-active={!fullReady} controls={!fullReady} muted loop playsInline autoPlay preload="none" aria-label={label}
      onPlaying={() => {
        stopShortFrame.current();
        stopShortFrame.current = waitForMotionFrame(short.current!, () => { setShortReady(true); setRequested(true); });
        if (requested) prepareFull();
      }}
      onSeeking={() => {
        if (fullReady || !preparing.current) return;
        stopFullFrame.current();
        preparing.current = false;
        full.current?.pause();
      }}
      onSeeked={prepareFull}
      onRateChange={() => { if (full.current && short.current) full.current.playbackRate = short.current.playbackRate; }}
      onError={() => { setShortFailed(true); setRequested(true); }} />
    <video ref={full} className="motion-full-video" src={requested && !fullFailed ? original : undefined}
      poster={poster || undefined} style={{ visibility: fullReady ? 'visible' : 'hidden' }}
      data-motion-active={fullReady} controls={fullReady} muted loop playsInline preload={requested ? 'auto' : 'none'}
      aria-label={label} aria-hidden={!fullReady} onCanPlay={prepareFull}
      onPlaying={() => {
        if (fullReady) return;
        if (!fullReady && !shortFailed && short.current?.paused) {
          full.current?.pause(); preparing.current = false; return;
        }
        stopFullFrame.current();
        stopFullFrame.current = waitForMotionFrame(full.current!, () => {
          if (!shortFailed && short.current?.paused) { full.current?.pause(); preparing.current = false; return; }
          setFullReady(true);
          short.current?.pause();
        });
      }}
      onError={() => {
        if (!requested) return;
        setFullFailed(true);
        preparing.current = false;
        if (fullReady) { setFullReady(false); void short.current?.play().catch(() => {}); }
      }} />
    {!(fullReady || (shortReady && !shortFailed)) && <div className="motion-video-cover" aria-hidden="true">{image}</div>}
  </div>;
}
