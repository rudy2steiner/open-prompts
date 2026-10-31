import type { ReactNode } from 'react';

/** 1/2/4 列共享一份 DOM；按序号横向分配，每列独立追加。 */
export function IndependentColumns<T>({ items, itemKey, renderItem, className = '' }: {
  items: T[];
  itemKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  className?: string;
}) {
  const columns: { item: T; index: number }[][] = [[], [], [], []];
  items.forEach((item, index) => columns[index % 4].push({ item, index }));
  return <div className={`independent-columns ${className}`.trim()}>
    <div className="independent-columns-surface">{[0, 1].map(parity => <div className="independent-columns-group" key={parity} style={{ order: parity }}>
      {[parity, parity + 2].map(column => <div className="independent-columns-column" key={column} style={{ order: column }}>
        {columns[column].map(({ item, index }) => <div className="independent-columns-item" key={itemKey(item)} data-item-key={itemKey(item)} style={{ order: index }}>{renderItem(item)}</div>)}
      </div>)}
    </div>)}</div>
  </div>;
}
