import type { ReactNode } from 'react';
import { IndependentColumns } from '~/components/prompt-gallery/IndependentColumns';

export function MotionMasonry<T>({ items, itemKey, renderItem }: {
  items: T[];
  itemKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
}) {
  return <IndependentColumns items={items} itemKey={itemKey} renderItem={renderItem} className="motion-masonry" />;
}
