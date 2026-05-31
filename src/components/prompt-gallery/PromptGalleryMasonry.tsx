'use client';

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const GUTTER_PX = 16;

function columnCountForWidth(width: number): number {
  if (width >= 1280) return 4;
  if (width >= 1024) return 3;
  if (width >= 640) return 2;
  return 1;
}

type ItemPosition = { x: number; y: number; width: number };

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
  const [colWidth, setColWidth] = useState(280);
  const [layout, setLayout] = useState<{
    positions: Map<string, ItemPosition>;
    height: number;
    ready: boolean;
  }>({ positions: new Map(), height: 0, ready: false });

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
      setLayout({ positions: new Map(), height: 0, ready: false });
      return;
    }

    const containerWidth = container.clientWidth;
    if (containerWidth <= 0) return;

    const cols = columnCountForWidth(containerWidth);
    const width = (containerWidth - GUTTER_PX * (cols - 1)) / cols;
    setColWidth(width);

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

    setLayout({ positions, height, ready: true });
  }, [items, itemKey]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    observerRef.current = new ResizeObserver(() => {
      relayout();
    });

    relayout();
    observeItems();

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [relayout, observeItems, items, layoutKey]);

  const setItemRef = (id: string, el: HTMLDivElement | null) => {
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
    observeItems();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: layout.ready ? layout.height : undefined, minHeight: layout.ready ? undefined : 160 }}
    >
      {items.map((item) => {
        const id = itemKey(item);
        const pos = layout.positions.get(id);
        const placed = layout.ready && pos;

        return (
          <div
            key={id}
            ref={(el) => setItemRef(id, el)}
            className="absolute left-0 top-0"
            style={{
              width: colWidth,
              transform: placed ? `translate3d(${pos.x}px, ${pos.y}px, 0)` : undefined,
              visibility: placed ? 'visible' : 'hidden',
            }}
          >
            {renderItem(item)}
          </div>
        );
      })}
    </div>
  );
}
