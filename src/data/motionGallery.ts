import candidates from './imports/motion-prompts-candidates.json';
import { MOTION_CATEGORIES, MOTION_ENTRIES, type MotionCategory, type MotionEntry } from './promptMotion';

export type MotionGalleryEntry = Omit<MotionEntry, 'type'> & {
  type: MotionEntry['type'] | null;
  hasDetail: boolean;
};

const modelNames: Record<string, string> = {
  'opus-5.5': 'Opus 5.5', 'sonnet-5.5': 'Sonnet 5.5', 'fable-5.5': 'Fable 5.5',
};

/** 候选仅展示视频与作者；未核验的提示词不提供复制或生成详情页。 */
export const MOTION_GALLERY_ENTRIES: MotionGalleryEntry[] = [
  ...MOTION_ENTRIES.map(entry => ({ ...entry, hasDetail: true })),
  ...candidates.cases.map(entry => {
    const [width, height] = entry.aspectRatio ?? [16, 9];
    return {
      id: entry.id, title: entry.title, author: entry.author, type: null,
      model: entry.model.split(', ').map(model => modelNames[model] ?? model).join(' / '),
      categories: entry.categories.filter((category): category is MotionCategory =>
        (MOTION_CATEGORIES as readonly string[]).includes(category)),
      prompt: '', sourceUrl: entry.sourceUrl, promptSourceUrl: entry.promptSourceUrl ?? entry.sourceUrl,
      collectionUrl: entry.discoveryUrl, poster: entry.poster, video: entry.video,
      width, height, hasDetail: false,
    };
  }),
];
