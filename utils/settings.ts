import { storage } from 'wxt/utils/storage';


type Provider = 'google' | 'lmstudio';


type GoogleSettings = {
    provider: 'google';
    apiKey: string;
}

type LMStudioSettings = {
    provider: 'lmstudio';
    baseUrl: string;
}

export type AIProviderSettings = GoogleSettings | LMStudioSettings;

export const settingsStorage = storage.defineItem<AIProviderSettings>("local:aiProvider", {
    version: 1
})