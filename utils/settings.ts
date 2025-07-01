import { storage } from 'wxt/utils/storage';

export type GoogleSettings = {
    provider: 'google';
    apiKey: string;
}

export type LMStudioSettings = {
    provider: 'lmstudio';
    baseUrl: string;
}

export type AIProviderSettings = GoogleSettings | LMStudioSettings;

export const settingsStorage = storage.defineItem<AIProviderSettings>("local:aiProvider", {
    version: 1
})