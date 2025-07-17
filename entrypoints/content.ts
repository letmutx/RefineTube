import { VideoRequest } from '../ai/base';

function extractShortsMetadata(videoContainer: HTMLElement): VideoRequest {
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
    views: views,
    age: null, // Unavailable for shorts
  }
}

function extractVideoMetadata(videoContainer: HTMLElement): VideoRequest {
  console.log("Extracting video metadata", videoContainer.tagName);
  const idNode = videoContainer.querySelector('a[data-href]') as HTMLAnchorElement;
  const videoId = idNode.getAttribute('data-href')?.split('v=')[1]?.split('&')[0];
  const title = videoContainer.querySelector('div#meta a#video-title yt-formatted-string, yt-lockup-metadata-view-model h3 span[role="text"]')?.textContent;
  const description = videoContainer.querySelector("yt-formatted-string#description-text")?.textContent;
  let views = null, age = null;
  const spans = videoContainer.querySelectorAll("div#metadata-line span, yt-content-metadata-view-model-wiz__metadata-row span");
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
  const videos: NodeListOf<HTMLAnchorElement> = document.querySelectorAll('a[href*="/watch"], a[href*="/shorts"]')
  videos.forEach(replaceHref);
}

type VideoState = 'safe' | 'unsafe' | 'loading' | 'unknown' | 'failed';

const selector = `
ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer,
ytm-shorts-lockup-view-model-v2, yt-lockup-view-model
`;

function registerClickListeners() {
  const app = document.getElementsByTagName('ytd-app')[0]
  if (!app) {
    console.error("ytd-app not found. Cannot register click listeners.");
    return;
  }

  const videoContainers = document.querySelectorAll(selector)
  videoContainers.forEach((videoContainer: Element) => {
    if (videoContainer.hasAttribute('refinetube-click-listener')) {
      return;
    }
    videoContainer.setAttribute('refinetube-click-listener', 'true');

    videoContainer.addEventListener('mousemove', (event: Event) => {
      const state = videoContainer.getAttribute('refinetube-state') as VideoState || 'unknown';
      if (state === 'loading' || state === 'failed' || state === 'unknown') {
        event.preventDefault();
        event.stopPropagation();
        console.log("Video is not processed yet, preventing default action.");
        return;
      }
    }, true);

    videoContainer.addEventListener('pointermove', (event: Event) => {
      const state = videoContainer.getAttribute('refinetube-state') as VideoState || 'unknown';
      if (state === 'loading' || state === 'failed' || state === 'unknown') {
        event.preventDefault();
        event.stopPropagation();
        console.log("Video is not processed yet, preventing default action.");
        return;
      }
    }, true);

    videoContainer.addEventListener('mouseenter', (event: Event) => {
      const state = videoContainer.getAttribute('refinetube-state') as VideoState || 'unknown';
      if (state === 'loading' || state === 'failed' || state === 'unknown') {
        event.preventDefault();
        event.stopPropagation();
        console.log("Video is not processed yet, preventing default action.");
        return;
      }
    }, true);

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
                return;
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
            });
          } catch (error) {
            console.error("Error extracting video metadata:", error);
            videoContainer.setAttribute('refinetube-state', 'failed');
            return;
          }
      }
    }, true);
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
    const pageManager = document.getElementsByTagName('ytd-app')[0]
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
