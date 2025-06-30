import { LMStudio } from "../ai/lmstudio";
import { AIProviderSettings } from '@/utils/settings';

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


export default defineBackground(() => {
  const settings = settingsStorage.getValue().then((settings: AIProviderSettings) => {
    if (settings === undefined || settings == null) {
      throw new Error("AI Provider settings not found. Please configure the AI provider in the settings.");
    }
    switch (settings.provider) {
      case 'google':
        console.warn("Google AI provider is not supported yet. Please use LM Studio.");
        throw new Error("Google AI provider is not supported yet. Please use LM Studio.");
      case 'lmstudio':
        return settings;
    }
  }).catch((error) => {
    console.error("Error loading AI provider settings:", error);
    return null;
  });

  if (settings === null) {

  }

  // ((settings) => {
  //   if (settings === undefined || settings == null) {
  //     throw new Error("AI Provider settings not found. Please configure the AI provider in the settings.");
  //   }
  //   if (settings.provider === 'google') {
  //     console.warn("Google AI provider is not supported yet. Please use LM Studio.");
  //   } else if (settings.provider === 'lmstudio') {
  //     console.log("Using LM Studio as AI provider with base URL:", settings.baseUrl);
  //     lmStudio.load(settings.baseUrl);
  //   } else {
  //     throw new Error(`Unknown AI provider: ${settings.provider}`);
  //   }
  // })

  const lmStudio = new LMStudio();
  (async () => {
    await lmStudio.load()
  })();


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

    const body = await fetch(thumbnailUrl).then(res => res.blob());
    const thumb = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(body);
    });

    console.log("Processing video:", videoId);

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