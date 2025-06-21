import { LLM, LMStudioClient, ModelNamespace } from '@lmstudio/sdk';
import { z } from 'zod';

const prompt = `
You are an assistant that rates a video on a scale of 1 to 10 based on how informative you think they are.  Rate non-informative videos lower. You are provided with structured JSON metadata about the video with the following fields:

title: title of the video
description: Optional description of the video, it will be NULL if the description could not be retrieved.
age: time since the video was published
length: duration of the video
views: number of views for the video

Use the attached thumbnail image also. In general, click bait, entertainment videos should be scored lower and informative videos higher. Analyse the video title and description for shock factor and other attention grabbing techniques and rate the video lower. Your output should be a json with 2 fields:
score: your score for the video
explanation: your explanation for the score
`

const schema = z.object({
  score: z.number().int(),
  explanation: z.string()
})

interface VideoRequest {
  title: string
  description: string | null
  age: string
  length: string,
  views: string,
}


class LMStudio {
  client: LMStudioClient
  model?: LLM
  constructor(baseUrl: string = "ws://localhost:1234") {
    this.client = new LMStudioClient({
      baseUrl: baseUrl
    });
  }

  async load(model: string = "gemma-3-4b-it-qat") {
    this.model = await this.client.llm.model(model)
  }

  async request(options: VideoRequest, thumb: string) {
    const t = await this.client.files.prepareImageBase64("thumbnail", thumb)

    const response = await this.model?.respond([
      { role: 'system', content: prompt },
      { role: 'user', content: JSON.stringify(options), images: [t] },
    ], {
      structured: schema,
    })
    if (response !== undefined && response?.content === undefined) {
      return JSON.parse(response?.content)
    }
    throw new Error('Response is undefined or does not contain content');
  }
}


export default defineBackground(async () => {
  // console.log('Hello background!', { id: browser.runtime.id });
  const lmStudio = new LMStudio();
  await lmStudio.load()
  browser.runtime.onMessage.addListener(async (message, _, sendResponse) => {
    if (message.action !== 'videoClicked') {
      return;
    }

    const { title, description, age, length, views, thumbnailUrl } = message.data;
    const body = await fetch(thumbnailUrl).then(res => res.blob());
    const thumb = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(body);
    });

    try {
      const resp = await lmStudio.request({
        title,
        description,
        age,
        length,
        views
      }, thumb);
      sendResponse({ status: "success", data: resp });
    } catch (error) {
      sendResponse({ status: "failed", error: (error as Error).message });
    }
    return true
  });
});