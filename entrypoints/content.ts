
// TODO: make it work with shorts
function extractMetadata(videoContainer: HTMLElement) {
  if (videoContainer == null) {
    return null;
  }
  const thumbNode = videoContainer.querySelector('ytd-thumbnail a#thumbnail yt-image img') as HTMLImageElement;
  const thumbnail = thumbNode ? thumbNode.src : null;
  const idNode = videoContainer.querySelector('ytd-thumbnail a#thumbnail') as HTMLAnchorElement;
  const videoId = idNode ? idNode.getAttribute('data-href')?.split('v=')[1]?.split('&')[0] : null;
  const title = videoContainer.querySelector("div#meta a#video-title yt-formatted-string")?.textContent;
  const description = videoContainer.querySelector("yt-formatted-string#description-text")?.textContent;
  let views = null, age = null;
  const spans = videoContainer.querySelectorAll("div#metadata-line span");
  for (let i = 0; i < spans.length; i++) {
    const content = spans[i]?.textContent;
    if (content == null) {
      continue
    } else if (content.includes("views")) {
      views = content.split(" ")[0]; // strip off "views" from string
    } else if (content.includes(" ago")) {
      age = content.substr(0, content.length - 4); // strip off "ago" from string
    }
  }
  const resp = {
    videoId: videoId,
    title: title,
    description: description,
    thumbnailUrl: thumbnail,
    views: views,
    age: age
  };
  return resp
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
        case 'safe':
          console.log("Safe video clicked, allowing default action.");
          return
        case 'unsafe':
          event.preventDefault();
          event.stopPropagation();
          console.log("Unsafe video clicked, preventing default action.");
          break;
        case 'loading':
          event.preventDefault();
          event.stopPropagation();
          console.log("Video is loading, preventing default action.");
          break;
        case 'failed':
          console.log("Video failed to load, preventing default action.");
          break;
        case 'unknown':
          event.preventDefault();
          event.stopPropagation();
          videoContainer.setAttribute('refinetube-state', 'loading');
          const videoData = extractMetadata(videoContainer as HTMLElement);
          browser.runtime.sendMessage({
            action: "videoClicked",
            data: videoData
          }, response => {
            if (response === undefined) {
              return
            }
            if (response.status == "success") {
              const thumbNode = videoContainer.querySelector('ytd-thumbnail a#thumbnail yt-image img') as HTMLImageElement;
              if (response.data.score > 5) {
                videoContainer.setAttribute('refinetube-state', 'safe');
                // also restore a hrefs
                thumbNode.src = "https://openclipart.org/image/2400px/svg_to_png/28688/skotan-Thumbs-up-smiley.png"
              } else {
                videoContainer.setAttribute('refinetube-state', 'unsafe');
                thumbNode.src = "https://openclipart.org/image/2400px/svg_to_png/63433/Thumbs-down-smiley2.png"
              }
            } else {
              videoContainer.setAttribute('refinetube-state', 'failed');
            }
          })
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
