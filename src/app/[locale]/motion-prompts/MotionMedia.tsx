'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { waitForMotionFrame } from '~/lib/motion/first-frame';
import { ProgressiveMotionVideo } from './ProgressiveMotionVideo';
import type { MotionSummary } from '~/lib/motion/types';

type MediaEntry = Pick<MotionSummary, 'title' | 'author' | 'video' | 'poster' | 'width' | 'height' | 'previewVideo'>;
export function MotionMedia({ entry, hero = false, preview = false }: { entry: MediaEntry; hero?: boolean; preview?: boolean }) {
  const t = useTranslations('OpenPrompts.promptMotionPage');
  const container = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stopFrame = useRef<() => void>(() => {});
  const [activated, setActivated] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  useEffect(() => {
    const element = container.current;
    if (!element || !entry.video || failed) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const update = () => {
      if (!visible || document.hidden) {
        element.querySelectorAll('video').forEach(player => player.pause());
        setActivated(false);
        setPlaying(false);
      } else if (reduced.matches) element.querySelectorAll('video').forEach(player => player.pause());
      else {
        setActivated(true);
        element.querySelectorAll<HTMLVideoElement>('video[data-motion-active="true"]').forEach(player => { void player.play().catch(() => {}); });
        void video.current?.play().catch(() => {});
      }
    };
    const observer = new IntersectionObserver(([item]) => { visible = item.isIntersecting; update(); });
    observer.observe(element);
    reduced.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      reduced.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [hero, entry.video, failed]);
  // 移出视口时卸载播放器并中止下载，避免暂停后仍后台拉取整段文件。
  useEffect(() => {
    const element = video.current;
    if (!activated || !element) return;
    return () => { stopFrame.current(); element.pause(); element.removeAttribute('src'); element.load(); };
  }, [activated, failed]);
  const poster = entry.poster && !posterFailed ? entry.poster : null;
  const image = poster ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={poster} alt="" width={entry.width} height={entry.height} loading={hero || activated ? 'eager' : 'lazy'} fetchPriority={hero ? 'high' : 'auto'} decoding="async" onError={() => setPosterFailed(true)} />
  ) : <div className="motion-preview-missing"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="m3 16 5-5 4 4 3-3 6 6" /><circle cx="16" cy="8" r="1" /></svg><span>{t('noPreview')}</span></div>;
  return <div ref={container} className={`motion-media ${hero ? 'motion-media-hero' : ''} ${!poster ? 'motion-media-no-poster' : ''}`} style={{ aspectRatio: `${entry.width} / ${entry.height}` }}>
    {entry.video && !failed ? activated ? !preview && entry.previewVideo ? <ProgressiveMotionVideo
      preview={entry.previewVideo} original={entry.video} poster={poster} image={image} label={`${entry.title} — @${entry.author}`} /> : <>
      <video ref={video} src={preview && entry.previewVideo ? entry.previewVideo : entry.video} poster={poster || undefined} width={entry.width} height={entry.height} controls muted loop playsInline autoPlay preload="none" aria-label={`${entry.title} — @${entry.author}`}
        onLoadStart={() => { stopFrame.current(); setPlaying(false); }} onPlaying={() => {
          stopFrame.current();
          stopFrame.current = waitForMotionFrame(video.current!, () => setPlaying(true));
        }}
        onError={() => { setPlaying(false); setFailed(true); }} />
      {!playing && <div className="motion-video-cover" aria-hidden="true">{image}</div>}
    </> : <button type="button" className="motion-media-play" aria-label={`${t('playVideo')}: ${entry.title}`} onClick={() => { setActivated(true); setPlaying(false); }}>
      {image}<span className="motion-play-icon" aria-hidden="true">▶</span>
    </button> : <div className="motion-static-preview" role="img" aria-label={`${entry.title} — ${poster ? t('staticPreview') : t('noPreview')}`}>{image}</div>}

  </div>;
}
