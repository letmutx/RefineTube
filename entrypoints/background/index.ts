import { LMStudio } from "../../ai/lmstudio";
import { GoogleStudio } from "../../ai/google";
import { AIProviderSettings, LMStudioSettings, GoogleSettings } from '@/utils/settings';

const prompt = `
You are an assistant that rates a video on a scale of 1 to 10 based on how informative you think the video is. Rate non-informative videos lower. You are provided with structured JSON metadata about the video with the following fields:
title: title of the video
description: Optional description of the video, it will be NULL if the description could not be retrieved.
age: time since the video was published
length: duration of the video
views: number of views for the video

Use the attached thumbnail image also. In general, click bait, entertainment videos should be scored lower and informative videos higher. Analyse the video title and description for shock factor and other attention grabbing techniques and rate the video lower. Your output should be a json with 2 fields:
score: your score for the video
explanation: your explanation for the score
`

type StateInit = { state: 'init' };
type StateLoaded = { state: 'loaded', client: LMStudio | GoogleStudio }
type StateFailed = { state: 'failed', error: string }

type State = StateInit | StateLoaded | StateFailed;

async function load(settings: AIProviderSettings): Promise<LMStudio | GoogleStudio> {
  switch (settings.provider) {
    case 'google':
      return new GoogleStudio(prompt, (settings as GoogleSettings).apiKey);
    case 'lmstudio':
      const lmStudio = new LMStudio(prompt, (settings as LMStudioSettings).baseUrl);
      await lmStudio.load();
      return lmStudio;
  }
}

export default defineBackground(() => {

  let currentState: State = { state: 'init' };

  settingsStorage.getValue().then(async (settings: AIProviderSettings) => {
    if (settings === undefined || settings == null) {
      console.log("AI Provider settings not found. Please configure the AI provider in the settings.");
      return
    }
    currentState = { state: 'loaded', client: await load(settings) };
  }).catch((error) => {
    currentState = { state: 'failed', error: (error as Error).message };
  });

  settingsStorage.watch(async (newSettings) => {
    currentState = { state: 'init' };
    currentState = { state: 'loaded', client: await load(newSettings) };
  })

  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason !== "install") return;
    // Open a tab on install
    await browser.tabs.create({
      url: browser.runtime.getURL('/get-started.html'),
      active: true,
    });
  });


  browser.runtime.onMessage.addListener(async (message, _, sendResponse) => {
    if (message.action !== 'videoElementFound') {
      return;
    }
    const { videoId, title, description, age, length, views, thumbnailUrl } = message.data;

    console.log("Processing video:", videoId);

    switch (currentState.state) {
      case 'loaded':
        try {
          const resp = await currentState.client.request({
            title,
            description,
            age,
            length,
            views,
            thumbnailUrl,
          });
          sendResponse({ status: "success", data: resp });
        } catch (error) {
          sendResponse({ status: "failed", error: (error as Error).message });
        }
      case 'init':
        sendResponse({ status: "failed", error: "AI provider is not initialized yet. Please wait." });
        break;
      case 'failed':
        sendResponse({ status: "failed", error: currentState.error });
        break;
    }

    return true
  });
});