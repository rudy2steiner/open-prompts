import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pagePath = resolve(process.cwd(), 'src/app/[locale]/create/PageComponent.tsx');
const templatePickerPath = resolve(process.cwd(), 'src/components/create/CreateTemplatePicker.tsx');

function createPageSource() {
  return readFileSync(pagePath, 'utf8');
}

test('create workspace uses a document-scrolling two-panel shell', () => {
  const source = createPageSource();

  assert.match(source, /data-create-workspace/);
  assert.match(source, /lg:grid-cols-\[380px_minmax\(0,1fr\)\]/);
  assert.doesNotMatch(source, /html,\s*\n\s*body\s*\{[\s\S]*?overflow:\s*hidden/);
  assert.doesNotMatch(source, /lg:grid-cols-\[260px_1fr_300px\]/);
});

test('result stage and mobile generate action are always rendered', () => {
  const source = createPageSource();

  assert.match(source, /data-create-stage/);
  assert.match(source, /data-mobile-generate/);
  assert.match(source, /const \[mobileCtaVisible, setMobileCtaVisible\]/);
  assert.match(source, /new IntersectionObserver/);
  assert.match(source, /mobileCtaVisible \? 'fixed' : 'hidden'/);
  assert.doesNotMatch(source, /data-create-stage[^>]*className="[^"]*hidden[^"]*lg:flex/);
});

test('marketing content follows the workspace instead of living inside it', () => {
  const source = createPageSource();
  const workspaceEnd = source.indexOf('{/* Create workspace end */}');
  const marketingStart = source.indexOf('data-create-marketing');
  const marketingSource = source.slice(marketingStart);

  assert.ok(workspaceEnd > 0, 'workspace end marker is present');
  assert.ok(marketingStart > workspaceEnd, 'marketing content follows workspace');
  assert.doesNotMatch(source, /prompts\.slice\(0,\s*50\)/);
  assert.doesNotMatch(source, /\{false \?/);
  assert.doesNotMatch(source, /<aside className="hidden"/);
  assert.match(marketingSource, /hero\.howSteps/);
  assert.match(marketingSource, /hero\.features/);
  assert.match(marketingSource, /hero\.faqs/);
});

test('generation polling carries generationId through settlement', () => {
  const source = createPageSource();

  assert.match(source, /const \[generationId, setGenerationId\]/);
  assert.match(source, /setGenerationId\(res\.generationId/);
  assert.match(source, /generationId=\$\{encodeURIComponent\(generationId\)\}/);
  assert.match(source, /if \(generationInFlightRef\.current\) return/);
  assert.match(source, /disabled=\{generationInFlight\}/);
});

test('generate action validates required inputs without a fake 2000 character cap', () => {
  const source = createPageSource();

  assert.match(source, /const promptValidationError =/);
  assert.match(source, /imageMode !== 'text' && !referenceItems\.length/);
  assert.match(source, /gen\.referenceToImage/);
  assert.match(source, /gen\.imageEdit/);
  assert.match(source, /type="file"/);
  assert.match(source, /\/api\/generations\/upload/);
  assert.doesNotMatch(source, /promptText\.length\}\s*\/\s*2000/);
});

test('workspace exposes template picker, resolution settings, and result tabs', () => {
  const source = createPageSource();

  assert.match(source, /CreateTemplatePicker/);
  assert.match(source, /const \[resolution, setResolution\]/);
  assert.match(source, /IMAGE_RESOLUTIONS/);
  assert.match(source, /const \[resultTab, setResultTab\]/);
  assert.match(source, /GenerationImageTile/);
});

test('template selection is optional and a selected template can be previewed or cleared', () => {
  const source = createPageSource();

  assert.match(source, /useState<string>\(''\)/);
  assert.match(source, /return prompts\.find\(\(p\) => p\.id === selectedId\)/);
  assert.doesNotMatch(source, /found \?\? prompts\[0\]/);
  assert.match(source, /openViewer\(item\.images/);
  assert.match(source, /setSelectedId\(''\)/);
});

test('template picker keeps natural cover ratios in a masonry flow', () => {
  const source = readFileSync(templatePickerPath, 'utf8');

  assert.match(source, /PromptGalleryMasonry/);
  assert.match(source, /columnMinWidth=\{180\}/);
  assert.match(source, /bootstrap=\{false\}/);
  assert.match(source, /naturalCover/);
  assert.doesNotMatch(source, /aspect-\[4\/3\]/);
  assert.doesNotMatch(source, /className="object-cover"/);
});

test('template picker reuses the gallery category and sub-tag filters', () => {
  const source = readFileSync(templatePickerPath, 'utf8');

  assert.match(source, /GalleryFilterStrip/);
  assert.match(source, /image-prompts\/gallery-page\.css/);
  assert.match(source, /filterPromptGalleryItems/);
  assert.match(source, /mergeCategoryTags/);
  assert.match(source, /const \[categoryId, setCategoryId\]/);
  assert.match(source, /const \[subTag, setSubTag\]/);
  assert.match(source, /tSubmit\(`categories\.\$\{id\}`\)/);
  assert.match(source, /\[&_\.op-gallery-cat-pill\]:shrink-0/);
  assert.match(source, /\[&_\.op-gallery-cat-pill\]:whitespace-nowrap/);
});

test('template picker reuses gallery cards and previews every template image', () => {
  const pickerSource = readFileSync(templatePickerPath, 'utf8');
  const pageSource = createPageSource();

  assert.match(pickerSource, /PromptGalleryCard/);
  assert.match(pickerSource, /PromptGallerySwipeViewer/);
  assert.match(pickerSource, /const \[preview, setPreview\]/);
  assert.match(pickerSource, /onImageClick=/);
  assert.match(pickerSource, /showDescription/);
  assert.match(pickerSource, /showTags/);
  assert.match(pageSource, /item\.images\.length > 1/);
});

test('template picker includes the gallery model filter and progressively renders results', () => {
  const source = readFileSync(templatePickerPath, 'utf8');

  assert.match(source, /GalleryFilterStrip/);
  assert.match(source, /const PICKER_PAGE_SIZE =/);
  assert.match(source, /const \[limit, setLimit\]/);
  assert.match(source, /filtered\.slice\(0, limit\)/);
  assert.match(source, /onScroll=/);
});
