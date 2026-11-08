import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createHistoryStore, parseHistory, type HistoryEntry } from '../src/lib/create/history';

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value) };
}

function sharedLock() {
  let queue = Promise.resolve<unknown>(null);
  return (update: () => HistoryEntry[]) => {
    const next = queue.then(update);
    queue = next;
    return next;
  };
}

function entry(id: string): HistoryEntry {
  return { id, createdAt: Number(id.replace(/\D/g, '')) || 1, providerJobId: `job-${id}`, prompt: `prompt ${id}`, model: 'GPT Image 2', provider: 'internal', aspectRatio: '1:1', resolution: '1k', quality: '1k', count: 1, images: [`https://cdn.example.com/${id}.png`] };
}

test('simultaneous stale tabs serialize writes and preserve every entry', async () => {
  const storage = memoryStorage();
  const lock = sharedLock();
  const first = createHistoryStore(storage, lock);
  const second = createHistoryStore(storage, lock);
  assert.deepEqual(first.read(), []);
  assert.deepEqual(second.read(), []);
  await Promise.all([first.add(entry('text1')), second.add(entry('edit2')), first.add(entry('ref3'))]);
  assert.deepEqual(first.read().map((item) => item.id), ['ref3', 'edit2', 'text1']);
  assert.deepEqual(second.read().map((item) => item.id), ['ref3', 'edit2', 'text1']);
});

test('concurrent deletion never restores another deleted entry or drops a new entry', async () => {
  const storage = memoryStorage();
  const lock = sharedLock();
  const first = createHistoryStore(storage, lock);
  const second = createHistoryStore(storage, lock);
  await first.add(entry('a1'));
  await Promise.all([second.add(entry('b2')), first.remove('a1')]);
  assert.deepEqual(first.read().map((item) => item.id), ['b2']);
});

test('denied reads and failed writes preserve subsequent in-memory add and delete', async () => {
  for (const storage of [null, { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } }, { getItem: () => '[]', setItem: () => { throw new Error('quota'); } }]) {
    const store = createHistoryStore(storage, sharedLock());
    assert.deepEqual(store.read(), []);
    await store.add(entry('a1'));
    await store.add(entry('b2'));
    assert.deepEqual(store.read().map((item) => item.id), ['b2', 'a1']);
    await store.remove('a1');
    assert.deepEqual(store.read().map((item) => item.id), ['b2']);
  }
});

test('history is capped at 30 and ignores invalid stored data', async () => {
  const storage = memoryStorage();
  const store = createHistoryStore(storage, sharedLock());
  storage.setItem('op_create_history', '{bad');
  assert.deepEqual(store.read(), []);
  for (let i = 1; i <= 31; i++) await store.add(entry(`e${i}`));
  assert.equal(store.read().length, 30);
  assert.equal(store.read()[0].id, 'e31');
});

test('image retention preserves persisted entries after a metadata write fails', async () => {
  const storage = memoryStorage();
  let rejectWrites = false;
  const store = createHistoryStore({getItem:storage.getItem,setItem:(key,value) => {
    if (rejectWrites) throw new Error('Full');
    storage.setItem(key,value);
  }}, sharedLock());
  for (let index = 1; index <= 30; index++) await store.add(entry(`e${index}`));
  rejectWrites = true;
  await store.add(entry('e31'));
  const imageSources = store.imageSources();
  assert.ok(imageSources?.includes('https://cdn.example.com/e1.png'), 'the persisted oldest history still owns its file after a failed write');
  assert.ok(imageSources?.includes('https://cdn.example.com/e31.png'), 'unsaved current history also keeps its file');
  await store.remove('e2');
  assert.ok(store.imageSources()?.includes('https://cdn.example.com/e2.png'), 'a failed deletion does not authorize deleting the persisted image');
});

test('unreadable persistent metadata never authorizes image pruning', () => {
  const store = createHistoryStore({getItem:() => {throw new Error('Denied');},setItem:() => {}}, sharedLock());
  assert.equal(store.imageSources(), null);
});

test('invalid stored timestamps are normalized to a valid date', () => {
  for (const createdAt of ['bad', 1e100, -1e100]) {
    const [item] = parseHistory(JSON.stringify([{ ...entry('a1'), createdAt }]));
    assert.ok(Number.isFinite(new Date(item.createdAt).getTime()));
  }
});
