import { absoluteUrl } from '~/lib/seo/metadata';
import { GEO_PATH, geoCopy, geoPageUrl, siteOrigin } from '~/lib/geo/facts';

function pages(locale: 'en' | 'zh'): string {
  return [
    `- [Home](${absoluteUrl(locale, '')}): image prompt library and on-site generation.`,
    `- [Image prompts](${absoluteUrl(locale, '/image-prompts')}): browse, filter, and copy image prompts.`,
    `- [Motion prompts](${absoluteUrl(locale, '/motion-prompts')}): published motion prompts and short previews.`,
    `- [This brief](${geoPageUrl(locale)}): definition, steps, comparison, and limits.`,
    `- [Categories](${absoluteUrl(locale, '/category')}): image prompt categories.`,
    `- [Submit](${absoluteUrl(locale, '/submit')}): submit a public or private image prompt.`,
  ].join('\n');
}

export function llmsTxt(): string {
  const en = geoCopy('en');
  const zh = geoCopy('zh');
  return `# Open Prompts

${en.definition}

${zh.definition}

## Image prompts

${en.imageSummary}

## Motion prompts

${en.motionSummary}

## Pages

${pages('en')}

## Limits

${en.limits.map((item) => `- ${item}`).join('\n')}

## Full brief

- [llms-full.txt](${siteOrigin()}/llms-full.txt)
- [HTML brief](${geoPageUrl('en')})
`;
}

export function llmsFullTxt(): string {
  const en = geoCopy('en');
  const zh = geoCopy('zh');
  const faq = en.faqs.map((item) => `### ${item.q}\n\n${item.a}`).join('\n\n');
  return `${llmsTxt()}
## 中文

${zh.definition}

${zh.imageSummary}

${zh.motionSummary}

### 步骤

${zh.imageSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

${zh.motionSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

### 限制

${zh.limits.map((item) => `- ${item}`).join('\n')}

## Questions

${faq}

## Paths

- ${GEO_PATH}
- /image-prompts
- /motion-prompts
`;
}

export function geoMarkdownLink(): string {
  return `${siteOrigin()}/llms-full.txt`;
}
