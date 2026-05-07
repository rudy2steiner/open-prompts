export type TemplateVarType = 'string' | 'enum' | 'number';

export type TemplateVar = {
  name: string;
  label: string;
  type: TemplateVarType;
  required?: boolean;
  default?: string | number;
  enum?: string[];
  min?: number;
  max?: number;
};

export type PromptTemplate = {
  id: string;
  title: string;
  model: string;
  template: string;
  negativeTemplate?: string;
  variables: TemplateVar[];
};

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'japanese-fuji-film-portrait',
    title: 'Japanese Fuji Film Portrait (9:16)',
    model: 'GPT Image 2',
    template:
      '9:16 vertical {{subject}} portrait, single subject. Fujifilm analog aesthetic ({{film_stock}}), soft pastel tones, slight green-magenta shift, low contrast, gentle highlight roll-off, fine film grain, subtle halation, slightly vignette. Bright natural daylight, diffused sunlight through window, soft shadows, airy atmosphere. {{details}} Mood: {{mood}}.',
    negativeTemplate: '{{negative}}',
    variables: [
      { name: 'subject', label: '主体', type: 'string', required: true, default: 'young female idol' },
      {
        name: 'film_stock',
        label: '胶片风格',
        type: 'enum',
        required: true,
        enum: ['Pro 400H', 'Superia', 'Portra 400', 'Ektar 100'],
        default: 'Pro 400H',
      },
      {
        name: 'details',
        label: '细节补充',
        type: 'string',
        required: false,
        default: 'natural minimal makeup, fresh glowing skin, realistic texture',
      },
      {
        name: 'mood',
        label: '氛围',
        type: 'enum',
        required: true,
        enum: ['fresh', 'youthful', 'sweet', 'cinematic', 'minimal'],
        default: 'fresh',
      },
      {
        name: 'negative',
        label: '负向提示词',
        type: 'string',
        required: false,
        default: 'blurry, low quality, watermark, text, distorted, bad anatomy',
      },
    ],
  },
];

