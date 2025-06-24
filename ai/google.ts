import { GoogleGenAI } from "@google/genai";
import { VideoRequest, imageToBase64 } from "./base";

class GoogleStudio {
    systemPrompt: string;
    model: string;
    ai: GoogleGenAI
    constructor(model: string = "gemma-3-27b-qat", systemPrompt: string, apiKey: string) {
        this.systemPrompt = systemPrompt;
        this.model = model;
        this.ai = new GoogleGenAI({ apiKey: apiKey });
    }

    async request(options: VideoRequest) {
        const response = await this.ai.models.generateContent({
            model: this.model,
            contents: [
                {
                    text: this.systemPrompt,
                },
                {
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: await imageToBase64(options.thumbnailUrl),
                    },
                },
                {
                    text: JSON.stringify(options),
                }
            ]
        });
        if (response.text !== undefined) {
            let text = response.text;
            if (text?.startsWith("```json")) {
                text = text?.substring(7).trim();
            }
            if (text?.endsWith("```")) {
                text = text.slice(0, -3).trim();
            }
            return JSON.parse(text)
        }
        throw new Error('Response is undefined or does not contain content');
    }
}