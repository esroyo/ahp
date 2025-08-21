import type { prompt } from 'enquirer';

export type Prompt = typeof prompt;

export type PromptOptions = Exclude<Parameters<Prompt>[0], any[] | ((...args: any[]) => any)>;

