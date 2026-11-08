'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PromptGallerySwipeViewer } from '~/components/prompt-gallery/PromptGallerySwipeViewer';
import type { CreationReferenceImage, CreationShowcaseMedia as ShowcaseMedia } from '~/lib/generation/creation-showcase-media';

export type CreationMediaLabels = {
  inputs: string;
  outputs: string;
  unclassified: string;
  missingReference: string;
  partialReferences: string;
  extractedReference: string;
  embeddedReference: string;
  videoPreviewReference: string;
  source: string;
  mismatch: string;
  imageCount: string;
  zoom: string;
  close: string;
  prev: string;
  next: string;
  coverLoadFailed: string;
};

type MediaGroup = 'inputs' | 'outputs' | 'unclassified';

function ArtworkRail({
  group, images, title, labels, priority, tiled = false, selectedIndex, onIndexChange, onAspectRatioChange, onZoom,
}: {
  group: MediaGroup;
  images: CreationReferenceImage[];
  title: string;
  labels: CreationMediaLabels;
  priority: boolean;
  tiled?: boolean;
  selectedIndex?: number;
  onIndexChange: (group: MediaGroup, index: number) => void;
  onAspectRatioChange?: (ratio: number) => void;
  onZoom: (group: MediaGroup, index: number, trigger: HTMLButtonElement) => void;
}) {
  const [index, setIndex] = useState(0);
  const [height, setHeight] = useState<number>();
  const [failed, setFailed] = useState<string[]>([]);
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const equalHeight = tiled && images.length > 1;
  const imageRatios = images.map(image => ratios[image.src] ?? 1);
  const rowRatio = imageRatios.slice(0, 3).reduce((sum, ratio) => sum + ratio, 0);
  const mobileRowRatio = imageRatios.slice(0, 2).reduce((sum, ratio) => sum + ratio, 0);
  const strip = useRef<HTMLDivElement>(null);
  const railWidth = useRef(0);
  const currentIndex = useRef(index);
  currentIndex.current = index;
  const count = labels.imageCount.replace('{index}', String(index + 1)).replace('{count}', String(images.length));

  useEffect(() => {
    const broken = Array.from(strip.current?.querySelectorAll('img') ?? [])
      .filter(image => image.complete && image.naturalWidth === 0)
      .map(image => image.getAttribute('src')!);
    if (broken.length) setFailed(previous => [...previous, ...broken.filter(src => !previous.includes(src))]);
    const image = strip.current?.querySelector('img');
    if (tiled && !equalHeight && image?.naturalHeight) onAspectRatioChange?.(image.naturalWidth / image.naturalHeight);
  }, [tiled, equalHeight, onAspectRatioChange]);

  useEffect(() => {
    if (!equalHeight) return;
    const loaded = Object.fromEntries(Array.from(strip.current?.querySelectorAll('img') ?? [])
      .filter(image => image.naturalHeight > 0)
      .map(image => [image.getAttribute('src')!, image.naturalWidth / image.naturalHeight]));
    setRatios(previous => Object.entries(loaded).every(([src, ratio]) => previous[src] === ratio) ? previous : { ...previous, ...loaded });
  }, [equalHeight, images]);

  useEffect(() => {
    if (equalHeight) onAspectRatioChange?.(rowRatio / Math.min(3, images.length));
  }, [equalHeight, rowRatio, images.length, onAspectRatioChange]);

  useEffect(() => {
    if (tiled || selectedIndex === undefined || selectedIndex === currentIndex.current) return;
    currentIndex.current = selectedIndex;
    setIndex(selectedIndex);
    const el = strip.current;
    el?.scrollTo({ left: selectedIndex * el.clientWidth });
  }, [selectedIndex, tiled]);

  useEffect(() => {
    const el = strip.current;
    if (!el || tiled) return;
    railWidth.current = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (railWidth.current === el.clientWidth) return;
      railWidth.current = el.clientWidth;
      el.scrollTo({ left: currentIndex.current * railWidth.current });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [tiled]);

  useEffect(() => {
    if (tiled) return;
    const slide = strip.current?.children.item(index);
    if (!slide) return;
    const observer = new ResizeObserver(() => {
      const el = strip.current;
      const image = slide.querySelector('img');
      if (image?.naturalHeight) onAspectRatioChange?.(image.naturalWidth / image.naturalHeight);
      setHeight(slide.getBoundingClientRect().height + (el ? el.offsetHeight - el.clientHeight : 0));
    });
    observer.observe(slide);
    return () => observer.disconnect();
  }, [index, onAspectRatioChange, tiled]);

  return (
    <section className="op-artwork" data-group={group} aria-label={labels[group]}>
      <div className="op-artwork-heading">
        <span className="op-artwork-label">{labels[group]}</span>
        <div className="op-artwork-controls">
          <span className="op-artwork-count" aria-live="polite">{tiled ? images.length : count}</span>
        </div>
      </div>
      <div
        ref={strip}
        className={tiled ? 'op-artwork-grid' : 'op-artwork-strip'}
        style={{
          height: tiled ? undefined : height || undefined,
          minHeight: '4rem',
          ...(equalHeight ? {
            '--op-artwork-row-ratio': rowRatio,
            '--op-artwork-mobile-row-ratio': mobileRowRatio,
            '--op-artwork-row-gap': `${Math.min(3, images.length) - 1}rem`,
            '--op-artwork-mobile-row-gap': `${Math.min(2, images.length) - 1}rem`,
          } : {}),
        } as React.CSSProperties}
        onScroll={tiled ? undefined : event => {
          const el = event.currentTarget;
          if (el.clientWidth !== railWidth.current) return;
          const next = Math.max(0, Math.min(images.length - 1, Math.round(el.scrollLeft / (el.clientWidth || 1))));
          if (next === currentIndex.current) return;
          currentIndex.current = next;
          setIndex(next);
          onIndexChange(group, next);
        }}
      >
        {images.map((image, i) => (
          <div className="op-artwork-slide" key={image.src} style={equalHeight ? { '--op-artwork-image-ratio': imageRatios[i] } as React.CSSProperties : undefined}>
            <button
              type="button"
              onClick={event => onZoom(group, i, event.currentTarget)}
              tabIndex={tiled || i === index ? 0 : -1}
              aria-label={`${labels.zoom} · ${labels[group]} · ${i + 1} / ${images.length}`}
            >
              {failed.includes(image.src) ? <span className="op-artwork-error">{labels.coverLoadFailed}</span> : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.src}
                  alt={`${title} · ${labels[group]} · ${i + 1} / ${images.length}`}
                  loading={priority && i === 0 ? 'eager' : 'lazy'}
                  fetchPriority={priority && i === 0 ? 'high' : 'auto'}
                  decoding="async"
                  onLoad={equalHeight ? event => {
                    const ratio = event.currentTarget.naturalWidth / event.currentTarget.naturalHeight;
                    setRatios(previous => previous[image.src] === ratio ? previous : { ...previous, [image.src]: ratio });
                  } : tiled && i === 0 ? event => onAspectRatioChange?.(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight) : undefined}
                  onError={() => setFailed(previous => [...previous, image.src])}
                />
              )}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CreationShowcaseMedia({
  media, title, imageKeyPrefix, needsInput, priority = false, contentMismatch = false, labels,
}: {
  media: ShowcaseMedia;
  title: string;
  imageKeyPrefix: string;
  needsInput: boolean;
  priority?: boolean;
  contentMismatch?: boolean;
  labels: CreationMediaLabels;
}) {
  const [viewer, setViewer] = useState<{ group: MediaGroup; index: number }>();
  const [selection, setSelection] = useState({ inputs: 0, outputs: 0 });
  const [aspectRatio, setAspectRatio] = useState(() => {
    const size = media.inputs.find(image => image.origin?.extractedFrom === media.outputs[0])?.origin?.originalSize;
    return size ? size[0] / size[1] : 1;
  });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeViewer = () => {
    setViewer(undefined);
    requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
  };
  const groups: Record<MediaGroup, CreationReferenceImage[]> = {
    inputs: media.inputs.filter(image => !image.origin?.crop || !media.outputs.includes(image.origin.extractedFrom ?? '')),
    outputs: media.outputs.map(src => ({
      src,
      origin: media.inputs.find(image => image.origin?.crop && image.origin.extractedFrom === src)?.origin,
    })),
    unclassified: media.unclassified.map(src => ({ src })),
  };
  const paired = groups.inputs.length > 0 && groups.outputs.length > 0;
  const resultsOnly = groups.inputs.length === 0 && groups.outputs.length > 0;
  const syncSelection = (group: MediaGroup, index: number) => {
    if (group === 'unclassified') return;
    setSelection(previous => {
      const next = { ...previous, [group]: index };
      if (group === 'inputs') {
        const output = groups.outputs.findIndex(image => image.src === groups.inputs[index]?.origin?.extractedFrom);
        if (output >= 0) next.outputs = output;
      } else if (groups.inputs[previous.inputs]?.origin?.extractedFrom !== groups.outputs[index]?.src) {
        const input = groups.inputs.findIndex(image => image.origin?.extractedFrom === groups.outputs[index]?.src);
        if (input >= 0) next.inputs = input;
      }
      return next.inputs === previous.inputs && next.outputs === previous.outputs ? previous : next;
    });
  };

  return (
    <div className={`op-creation-media${resultsOnly && groups.unclassified.length === 0 ? ' is-results-only' : ''}${resultsOnly && groups.outputs.length > 1 ? ' is-equal-height' : ''}`} style={priority || resultsOnly ? {
      '--op-artwork-ratio': aspectRatio,
      '--op-artwork-columns': Math.min(3, groups.outputs.length),
      '--op-artwork-mobile-columns': Math.min(2, groups.outputs.length),
    } as React.CSSProperties : undefined}>
      {contentMismatch ? <p className="op-artwork-notice">{labels.mismatch}</p> : null}
      {needsInput && (media.inputs.length === 0 || (media.partialInputs && groups.inputs.length > 0)) ? (
        <p className="op-artwork-notice">{media.inputs.length === 0 ? labels.missingReference : labels.partialReferences}</p>
      ) : null}
      <div className={`op-creation-media-groups${paired ? ' is-paired' : ''}`}>
        {(['inputs', 'outputs', 'unclassified'] as const).map(group => groups[group].length > 0 ? (
          <ArtworkRail
            key={group}
            group={group}
            images={groups[group]}
            title={title}
            labels={labels}
            priority={priority && group !== 'unclassified'}
            selectedIndex={group === 'unclassified' ? undefined : selection[group]}
            onIndexChange={syncSelection}
            tiled={resultsOnly && group === 'outputs'}
            onAspectRatioChange={(priority || resultsOnly) && group === 'outputs' ? setAspectRatio : undefined}
            onZoom={(selectedGroup, index, trigger) => {
              triggerRef.current = trigger;
              trigger.focus({ preventScroll: true });
              setViewer({ group: selectedGroup, index });
            }}
          />
        ) : null)}
      </div>
      {viewer ? createPortal(
        <PromptGallerySwipeViewer
          open
          onClose={closeViewer}
          images={groups[viewer.group].map(image => image.src)}
          title={`${title} · ${labels[viewer.group]}`}
          imageKeyPrefix={`${imageKeyPrefix}-${viewer.group}`}
          initialIndex={viewer.index}
          coverLoadFailedText={labels.coverLoadFailed}
          closeLabel={labels.close}
          prevLabel={labels.prev}
          nextLabel={labels.next}
        />,
        document.body,
      ) : null}
    </div>
  );
}
