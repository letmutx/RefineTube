import { GoogleGenAI } from "@google/genai";
import { VideoRequest, imageToBase64 } from "./base";

export class GoogleStudio {
    systemPrompt: string;
    model: string;
    ai: GoogleGenAI
    constructor(systemPrompt: string, apiKey: string, model: string = "gemma-3-27b-qat") {
        this.systemPrompt = systemPrompt;
        this.model = model;
        this.ai = new GoogleGenAI({ apiKey: apiKey });
    }

    async request(options: VideoRequest) {
        let base64 = await imageToBase64(options.thumbnailUrl)
        const { thumbnailUrl, videoId, ...request } = { ...options };
        const response = await this.ai.models.generateContent({
            model: this.model,
            contents: [
                {
                    text: this.systemPrompt,
                },
                {
                    inlineData: {
                        mimeType: base64.split("base64,")[0].replace("data:", "").replace(";", ""),
                        data: base64.replace(/^data:image\/[a-z]+;base64,/, ""),
                    },
                },
                {
                    text: JSON.stringify(request),
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