import { LMStudio } from "../ai/lmstudio";

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


export default defineBackground(() => {
  console.log("Background script loaded");
  const lmStudio = new LMStudio(prompt);
  (async () => {
    await lmStudio.load()
  })();

  browser.runtime.onMessage.addListener((message, _, sendResponse) => {
    if (message.action !== 'videoElementFound') {
      return;
    }

    const { videoId, title, description, age, length, views, thumbnailUrl } = message.data;
    (async () => {
      console.log("Processing video:", videoId);
      try {
        const resp = await lmStudio.request({
          title,
          description,
          age,
          length,
          views,
          thumbnailUrl
        });
        sendResponse({ status: "success", data: resp });
      } catch (error) {
        sendResponse({ status: "failed", error: (error as Error).message });
      }
    })()
    return true
  });
});