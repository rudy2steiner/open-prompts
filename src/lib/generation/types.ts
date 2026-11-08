export type GenerationStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export type ImageResolution = '1k' | '2k' | '4k';

export type GenerationCreateParams = {
  prompt: string;
  negativePrompt?: string;
  model?: string;
  aspectRatio?: string;
  resolution?: ImageResolution;
  quality?: string;
  count?: number;
  referenceImages?: string[];
};

export type GenerationCreateResult = {
  providerJobId: string;
  status: GenerationStatus;
};

export type GenerationPollResult = {
  providerJobId: string;
  status: GenerationStatus;
  images?: string[];
  error?: string;
};

export type ImageGenerationProvider = {
  provider: string;
  create(params: GenerationCreateParams): Promise<GenerationCreateResult>;
  poll(providerJobId: string): Promise<GenerationPollResult>;
};

