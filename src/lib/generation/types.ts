export type GenerationStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export type GenerationCreateParams = {
  prompt: string;
  negativePrompt?: string;
  model?: string;
  aspectRatio?: string;
  quality?: string;
  count?: number;
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

