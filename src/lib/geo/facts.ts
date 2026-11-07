import { absoluteUrl, getSiteUrl } from '~/lib/seo/metadata';

export const GEO_PATH = '/ai-prompt-library';

export type GeoCopy = {
  name: string;
  metaDescription: string;
  definition: string;
  imageSummary: string;
  motionSummary: string;
  stepsTitle: string;
  imageSteps: string[];
  motionSteps: string[];
  compareTitle: string;
  compareHeaders: [string, string, string];
  compareRows: [string, string, string][];
  limitsTitle: string;
  limits: string[];
  faqTitle: string;
  faqs: { q: string; a: string }[];
};

const en: GeoCopy = {
  name: 'Open Prompts',
  metaDescription:
    'Public library of AI image prompts and motion prompts for Claude and GPT Image 2',
  definition:
    'Open Prompts is a public library of AI image prompts and motion prompts. An image card shows the finished picture, the model, and a prompt you can copy into ChatGPT, GPT Image 2, Midjourney, or DALL·E. A motion card pairs a short preview with the creator’s published prompt for Claude or another coding agent.',
  imageSummary:
    'Browsing and copying image prompts does not require an account. Generating an image on this site uses credits. The same prompt does not guarantee the same picture.',
  motionSummary:
    'Copy a motion prompt into a coding agent and add the reference assets or skills the card names. The preview is one finished run. A new run is a new result, not a frame-for-frame copy. The model name on the card is the one the author reported.',
  stepsTitle: 'How to use a prompt',
  imageSteps: [
    'Open the image prompt library.',
    'Filter by model or category when you need a narrower set.',
    'Copy the prompt from the card or its detail page.',
    'Paste it into ChatGPT, GPT Image 2, Midjourney, or DALL·E, or generate it on this site if you have credits.',
  ],
  motionSteps: [
    'Open the motion prompt library.',
    'Copy the prompt from the card.',
    'Paste it into Claude or another coding agent.',
    'Add the reference assets and skills the card names, such as claude-motion, motion-graphics-skills, HyperFrames, or Remotion.',
  ],
  compareTitle: 'Image prompts and motion prompts',
  compareHeaders: ['', 'Image prompts', 'Motion prompts'],
  compareRows: [
    ['What you copy', 'A text prompt for an image model', 'A text prompt for a coding agent'],
    ['What you see first', 'The generated still', 'A short preview'],
    ['Where it runs', 'ChatGPT, GPT Image 2, Midjourney, DALL·E, or on this site', 'Claude or another coding agent'],
    ['Account', 'Not required to browse or copy', 'Not required to browse or copy'],
  ],
  limitsTitle: 'Limits',
  limits: [
    'Copying a prompt does not reproduce the same image or the same animation.',
    'A motion result depends on the agent, the model, the tools, and any reference assets.',
    'Browsing and copying are open. On-site image generation uses credits.',
    'Public image prompts are shared under CC BY 4.0 with attribution, as stated on the submit page.',
    'Crediting a motion author is not a commercial license for the animation.',
  ],
  faqTitle: 'Questions',
  faqs: [
    {
      q: 'What is Open Prompts?',
      a: 'A public library of AI image prompts and motion prompts. Image cards are for image models. Motion cards are published prompts for Claude and other coding agents.',
    },
    {
      q: 'Can I paste a motion prompt straight into Claude?',
      a: 'Yes. Paste the prompt as published. Add the reference assets and skills the card names. The result is a new run, not a copy of the preview.',
    },
    {
      q: 'Do I need an account to copy a prompt?',
      a: 'No. Browsing and copying are open. An account is required to submit a prompt. On-site image generation uses credits.',
    },
    {
      q: 'What license applies?',
      a: 'Public image prompts are shared under CC BY 4.0 with attribution. A motion credit line is not a commercial license for the animation.',
    },
  ],
};

const zh: GeoCopy = {
  name: 'Open Prompts',
  metaDescription: '公开的 AI 图片提示词和动效提示词库。可复制，或贴给 Claude。',
  definition:
    'Open Prompts 是一个公开的 AI 图片提示词和动效提示词库。图片卡片给出成图、模型和可复制的提示词，可粘贴到 ChatGPT、GPT Image 2、Midjourney 或 DALL·E。动效卡片给出短预览，以及作者公开发布、可粘贴到 Claude 或其他编程助手的提示词。',
  imageSummary: '浏览和复制图片提示词不需要账号。在本站生成图片会消耗额度。同一条提示词不保证得到同一张图。',
  motionSummary:
    '把动效提示词复制到编程助手，并补上卡片要求的参考素材或 Skill。预览是一次已完成的运行。再跑一次是新的结果，不是逐帧复刻。卡片上的模型名是作者当时报告的模型。',
  stepsTitle: '怎么用一条提示词',
  imageSteps: [
    '打开图片提示词库。',
    '需要收窄范围时，按模型或分类筛选。',
    '从卡片或详情页复制提示词。',
    '粘贴到 ChatGPT、GPT Image 2、Midjourney 或 DALL·E；有额度时也可以在本站生成。',
  ],
  motionSteps: [
    '打开动效提示词库。',
    '从卡片复制提示词。',
    '粘贴到 Claude 或其他编程助手。',
    '补上卡片点名的参考素材和 Skill，例如 claude-motion、motion-graphics-skills、HyperFrames 或 Remotion。',
  ],
  compareTitle: '图片提示词和动效提示词',
  compareHeaders: ['', '图片提示词', '动效提示词'],
  compareRows: [
    ['复制的是什么', '给图像模型的文字提示词', '给编程助手的文字提示词'],
    ['先看到什么', '生成好的静图', '一段短预览'],
    ['在哪里运行', 'ChatGPT、GPT Image 2、Midjourney、DALL·E，或本站', 'Claude 或其他编程助手'],
    ['账号', '浏览和复制不需要', '浏览和复制不需要'],
  ],
  limitsTitle: '限制',
  limits: [
    '复制提示词不会复现同一张图或同一段动画。',
    '动效结果取决于助手、模型、工具，以及参考素材。',
    '浏览和复制是开放的。在本站生成图片会消耗额度。',
    '公开图片提示词按提交页所写，以 CC BY 4.0 共享并保留署名。',
    '给动效作者署名，不等于获得该动画的商业授权。',
  ],
  faqTitle: '问题',
  faqs: [
    {
      q: 'Open Prompts 是什么？',
      a: '公开的 AI 图片提示词和动效提示词库。图片卡片给图像模型用。动效卡片是发给 Claude 和其他编程助手的已发布提示词。',
    },
    {
      q: '动效提示词可以直接贴给 Claude 吗？',
      a: '可以。按发布的原文粘贴，并补上卡片点名的参考素材和 Skill。结果是一次新的运行，不是预览的拷贝。',
    },
    {
      q: '复制提示词需要账号吗？',
      a: '不需要。浏览和复制是开放的。提交提示词需要账号。在本站生成图片会消耗额度。',
    },
    {
      q: '使用什么许可？',
      a: '公开图片提示词以 CC BY 4.0 共享并保留署名。动效卡片上的署名不是该动画的商业授权。',
    },
  ],
};

export function geoCopy(locale: string): GeoCopy {
  return locale === 'zh' ? zh : en;
}

export function geoPageUrl(locale: string): string {
  return absoluteUrl(locale, GEO_PATH);
}

export function siteOrigin(): string {
  return getSiteUrl();
}
