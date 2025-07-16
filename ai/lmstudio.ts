import { LLM, LMStudioClient } from "@lmstudio/sdk";
import { z } from "zod";
import { VideoRequest, videoToThumbBase64 } from "./base";

export class LMStudio {
    client: LMStudioClient
    model?: LLM
    systemPrompt: string
    constructor(systemPrompt: string, baseUrl: string = "ws://localhost:1234") {
        this.client = new LMStudioClient({
            baseUrl: baseUrl
        });
        this.systemPrompt = systemPrompt;
    }

    async load(model: string = "gemma-3-27b-it-qat") {
        this.model = await this.client.llm.model(model)
    }

    async request(options: VideoRequest) {
        const imgBase64 = await videoToThumbBase64(options.videoId)
        const t = await this.client.files.prepareImageBase64("thumbnail", imgBase64);
        const schema = z.object({
            score: z.number().int(),
            explanation: z.string()
        })
        const { videoId, ...request } = { ...options };
        const response = await this.model?.respond(
            [
                { role: 'system', content: this.systemPrompt },
                { role: 'user', content: JSON.stringify(request), images: [t] },
            ],
            {
                structured: schema,
            }
        )
        if (response !== undefined && response?.content !== undefined) {
            return JSON.parse(response?.content)
        }
        throw new Error('Response is undefined or does not contain content');
    }
}