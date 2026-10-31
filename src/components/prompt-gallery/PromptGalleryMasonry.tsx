'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useId,
  useState,
  type ReactNode,
} from 'react';

import { GALLERY_MASONRY_BOOTSTRAP } from '~/lib/prompts/gallery-masonry-bootstrap';

const GUTTER_PX = 16;
const useMasonryLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function columnCountForWidth(width: number): number {
  if (width >= 1280) return 4;
  if (width >= 1024) return 3;
  if (width >= 640) return 2;
  return 1;
}

type ItemPosition = { x: number; y: number; width: number };
type Layout = { positions: Map<string, ItemPosition>; height: number; ready: boolean };
type Bootstrap = { width: number; layout: Layout; disconnect(): void };
declare global { interface Window { __opGalleryMasonry?: Record<string, Bootstrap> } }

type Props<T> = {
  items: T[];
  itemKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** Bumps when card heights may change (e.g. cover aspect preload). */
  layoutKey?: string;
};

/**
 * Shortest-column masonry in DOM order: #1–#4 span the top row, then each
 * item goes to the shortest column — packed tight, no flex/grid row gaps.
 */
export function PromptGalleryMasonry<T>({ items, itemKey, renderItem, layoutKey }: Props<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const observerRef = useRef<ResizeObserver | null>(null);
  const id = useId();
  const initial = typeof window === 'undefined' ? undefined : window.__opGalleryMasonry?.[id];
  const [colWidth, setColWidth] = useState(() => initial?.width ?? 280);
  const [layout, setLayout] = useState<Layout>(() => initial?.layout ?? { positions: new Map(), height: 0, ready: false });

  const layoutRef = useRef(layout);

  const observeItems = useCallback(() => {
    const observer = observerRef.current;
    const container = containerRef.current;
    if (!observer || !container) return;
    observer.disconnect();
    observer.observe(container);
    itemRefs.current.forEach((el) => {
      observer.observe(el);
    });
  }, []);

  const relayout = useCallback(() => {
    const container = containerRef.current;
    if (!container || items.length === 0) {
      if (layoutRef.current.ready) {
        const empty = { positions: new Map<string, ItemPosition>(), height: 0, ready: false };
        layoutRef.current = empty;
        setLayout(empty);
      }
      return;
    }

    const containerWidth = container.clientWidth;
    if (containerWidth <= 0) return;

    const cols = columnCountForWidth(containerWidth);
    const width = (containerWidth - GUTTER_PX * (cols - 1)) / cols;

    const colHeights = new Array<number>(cols).fill(0);
    const positions = new Map<string, ItemPosition>();

    for (const item of items) {
      const id = itemKey(item);
      const el = itemRefs.current.get(id);
      const itemHeight = el?.getBoundingClientRect().height ?? el?.offsetHeight ?? 0;

      let col = 0;
      for (let c = 1; c < cols; c++) {
        if (colHeights[c]! < colHeights[col]!) col = c;
      }

      const x = col * (width + GUTTER_PX);
      const y = colHeights[col]!;
      positions.set(id, { x, y, width });
      colHeights[col] = y + itemHeight + (itemHeight > 0 ? GUTTER_PX : 0);
    }

    const maxCol = Math.max(0, ...colHeights);
    const height = maxCol > 0 ? maxCol - GUTTER_PX : 0;

    // ResizeObserver 的首次通知和 ref 重绑定可能反复报告同一尺寸。
    // 几何数据未变时保留状态，避免重渲染再次启动测量。
    const previous = layoutRef.current;
    const unchanged = previous.ready && previous.height === height && previous.positions.size === positions.size &&
      Array.from(positions).every(([id, position]) => {
        const before = previous.positions.get(id);
        return before?.x === position.x && before.y === position.y && before.width === position.width;
      });
    if (unchanged) return;
    const next = { positions, height, ready: true };
    layoutRef.current = next;
    setColWidth(width);
    setLayout(next);
  }, [items, itemKey]);

  useMasonryLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (typeof ResizeObserver === 'undefined') return;
    const bootstrap = typeof window === 'undefined' ? undefined : window.__opGalleryMasonry?.[id];
    bootstrap?.disconnect();
    if (typeof window !== 'undefined' && window.__opGalleryMasonry) delete window.__opGalleryMasonry[id];
    container.dataset.masonryClient = 'true';
    observerRef.current = new ResizeObserver(() => {
      relayout();
    });

    relayout();
    observeItems();

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [relayout, observeItems, items, layoutKey, id]);

  const setItemRef = (id: string, el: HTMLDivElement | null) => {
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
    observeItems();
  };

  return (
    <div className="gallery-masonry">
    <div
      id={id}
      ref={containerRef}
      className="gallery-masonry-surface"
      data-gallery-masonry="shortest-column"
      data-gallery-initial-layout="columns"
      data-masonry-ready={layout.ready ? 'true' : undefined}
      style={layout.ready ? { height: layout.height } : undefined}
    >
      <script dangerouslySetInnerHTML={{ __html: GALLERY_MASONRY_BOOTSTRAP }} />
      {items.map((item) => {
        const id = itemKey(item);
        const pos = layout.positions.get(id);
        const placed = layout.ready && pos;

        return (
          <div
            key={id}
            data-gallery-item={id}
            ref={(el) => setItemRef(id, el)}
            className="gallery-masonry-item"
            style={{
              width: layout.ready ? colWidth : undefined,
              transform: placed ? `translate3d(${pos.x}px, ${pos.y}px, 0)` : undefined,
            }}
          >
            {renderItem(item)}
          </div>
        );
      })}
    </div>
    </div>
  );
}
