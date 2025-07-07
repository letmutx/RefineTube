import { VideoRequest } from '../ai/base';

function extractShortsMetadata(videoContainer: HTMLElement): VideoRequest {
  const thumbNode = videoContainer.querySelector('img.yt-core-image') as HTMLImageElement;
  const thumbnail = thumbNode.src;
  const videoId = videoContainer.querySelector('a[data-href*="/shorts"]')?.getAttribute('data-href')?.split("/").at(-1);
  const title = (videoContainer.querySelector('ytm-shorts-lockup-view-model-v2 h3.shortsLockupViewModelHostMetadataTitle a span[role="text"]') as HTMLSpanElement).innerText;
  const spans = videoContainer.querySelectorAll('span[role="text"]')
  let views = null;
  for (const span of spans) {
    // TODO: what if the language is different?
    if (span.textContent?.includes(" views")) {
      views = span.textContent.split(" ")[0]; // strip off "views" from string
      break;
    }
  }
  if (videoId == null) {
    throw new Error("Video ID not found in the shorts container");
  }
  return {
    isShort: true,
    videoId: videoId,
    title: title,
    description: null, // Shorts do not have descriptions in the same way as regular videos
    thumbnailUrl: thumbnail,
    views: views,
    age: null, // Unavailable for shorts
  }
}

function extractVideoMetadata(videoContainer: HTMLElement): VideoRequest {
  const thumbNode = videoContainer.querySelector('ytd-thumbnail a#thumbnail yt-image img') as HTMLImageElement;
  const thumbnail = thumbNode.src;
  const idNode = videoContainer.querySelector('ytd-thumbnail a#thumbnail') as HTMLAnchorElement;
  const videoId = idNode.getAttribute('data-href')?.split('v=')[1]?.split('&')[0];
  const title = videoContainer.querySelector("div#meta a#video-title yt-formatted-string")?.textContent;
  const description = videoContainer.querySelector("yt-formatted-string#description-text")?.textContent;
  let views = null, age = null;
  const spans = videoContainer.querySelectorAll("div#metadata-line span");
  for (let i = 0; i < spans.length; i++) {
    const content = spans[i]?.textContent;
    if (content == null) {
      continue
    } else if (content.includes(" views")) {
      // TODO: what if the language is different?
      views = content.split(" ")[0]; // strip off "views" from string
    } else if (content.includes(" ago")) {
      // TODO: what if the language is different?
      age = content.substr(0, content.length - 4); // strip off "ago" from string
    }
  }
  if (videoId === undefined) {
    throw new Error("Video ID not found in the video container");
  }
  return {
    isShort: false,
    videoId: videoId,
    title: title || null,
    description: description || null,
    thumbnailUrl: thumbnail,
    views: views || null,
    age: age,
  };
}

function isShort(videoContainer: HTMLElement) {
  return videoContainer.tagName == 'YTM-SHORTS-LOCKUP-VIEW-MODEL-V2'
}

function extractMetadata(videoContainer: HTMLElement) {
  if (videoContainer == null) {
    return null;
  }
  if (isShort(videoContainer)) {
    return extractShortsMetadata(videoContainer);
  }
  return extractVideoMetadata(videoContainer);
}

function replaceHref(link: HTMLAnchorElement) {
  link.setAttribute('data-href', link.href);
  link.removeAttribute('href');
}

function removeAnchorLinks() {
  const videos: NodeListOf<HTMLAnchorElement> = document.querySelectorAll('div#contents a[href*="/watch"], div#contents a[href*="/shorts"]')
  videos.forEach(replaceHref);
}

type VideoState = 'safe' | 'unsafe' | 'loading' | 'unknown' | 'failed';

function registerClickListeners() {
  const app = document.getElementsByTagName('ytd-app')[0]
  if (!app) {
    console.error("ytd-app not found. Cannot register click listeners.");
    return;
  }

  const videoContainers = document.querySelectorAll('#page-manager #contents ytd-rich-item-renderer, #page-manager #contents ytd-grid-video-renderer, #page-manager #contents ytd-video-renderer, #page-manager #contents ytm-shorts-lockup-view-model-v2')

  videoContainers.forEach((videoContainer: Element) => {
    if (videoContainer.hasAttribute('refinetube-click-listener')) {
      return
    }
    videoContainer.setAttribute('refinetube-click-listener', 'true');

    videoContainer.addEventListener('click', (event: Event) => {
      const state = videoContainer.getAttribute('refinetube-state') as VideoState || 'unknown';
      switch (state) {
        case 'loading':
          event.preventDefault();
          event.stopPropagation();
          console.log("Video is loading, preventing default action.");
          // TODO: show some cool loading animation
          break;
        case 'failed':
          console.log("Video failed to load, preventing default action.");
          break;
        case 'unknown':
          event.preventDefault();
          event.stopPropagation();
          try {
            const videoData = extractMetadata(videoContainer as HTMLElement);
            videoContainer.setAttribute('refinetube-state', 'loading');
            browser.runtime.sendMessage({
              action: "videoClicked",
              data: videoData
            }, response => {
              if (response === undefined) {
                videoContainer.setAttribute('refinetube-state', 'failed');
                return
              }
              // TODO: maybe restore hrefs?
              const vcHTMLElement = videoContainer as HTMLElement;
              if (response.status == "success") {
                if (response.data.score > 5) {
                  vcHTMLElement.style.border = "2px solid green";
                  videoContainer.setAttribute('refinetube-state', 'safe');

                } else {
                  vcHTMLElement.style.border = "2px solid red";
                  videoContainer.setAttribute('refinetube-state', 'unsafe');
                }
              } else {
                videoContainer.setAttribute('refinetube-state', 'failed');
              }
            })
          } catch (error) {
            console.error("Error extracting video metadata:", error);
            videoContainer.setAttribute('refinetube-state', 'failed');
            return;
          }
      }
    }, true)
  });
}

function setup() {
  removeAnchorLinks();
  registerClickListeners();
}

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  runAt: 'document_end',
  main() {
    const pageManager = document.getElementById('page-manager')
    if (!pageManager) {
      console.error("Page manager not found. Cannot set up mutation observer.");
      return;
    }
    setup();
    // Also run when the page content changes (for dynamic loading)
    const observer = new MutationObserver(() => {
      // TODO: maybe check if the mutation is relevant
      setup();
    });

    // Start observing changes to the document body
    observer.observe(pageManager, {
      childList: true,
      subtree: true
    });
  },
});
