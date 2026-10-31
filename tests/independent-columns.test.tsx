import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { create } from 'react-test-renderer';
import { IndependentColumns } from '../src/components/prompt-gallery/IndependentColumns';

const render = (count: number) => create(<IndependentColumns items={Array.from({length: count}, (_, i) => String(i))} itemKey={i => i} renderItem={i => <article>{i}</article>} />);
function lanes(count: number, columns: number) {
  const tree = render(count);
  const cards = tree.root.findAllByProps({className: 'independent-columns-item'});
  const result = Array.from({length: columns}, () => [] as string[]);
  for (const card of cards) {
    const column = columns === 4 ? card.parent!.props.style.order : columns === 2 ? card.parent!.parent!.props.style.order : 0;
    result[column].push(card.props['data-item-key']);
  }
  result.forEach(column => column.sort((a, b) => Number(a) - Number(b)));
  tree.unmount();
  return result;
}
test('responsive columns distribute cards horizontally in source order', () => {
  for (const columns of [1, 2, 4]) {
    const actual = lanes(37, columns);
    actual.forEach((column, index) => assert.deepEqual(column, Array.from({length: 37}, (_, i) => i).filter(i => i % columns === index).map(String)));
  }
});
test('appending any batch size preserves every column prefix', () => {
  for (const columns of [1, 2, 4]) {
    for (const count of [1, 11, 12, 18, 23]) {
      const before = lanes(count, columns), after = lanes(count + 13, columns);
      before.forEach((column, index) => assert.deepEqual(after[index].slice(0, column.length), column));
    }
  }
});
