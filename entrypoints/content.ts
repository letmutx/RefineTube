function extractMetadata(videoContainer: HTMLElement) {
  if (videoContainer == null) {
    return null;
  }
  const thumbNode = videoContainer.querySelector('ytd-thumbnail a#thumbnail yt-image img') as HTMLImageElement;
  const thumbnail = thumbNode ? thumbNode.src : null;
  const idNode = videoContainer.querySelector('ytd-thumbnail a#thumbnail') as HTMLAnchorElement;
  const videoId = idNode ? idNode.href.split('v=')[1]?.split('&')[0] : null;
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
  return {
    videoId: videoId,
    title: title,
    description: description,
    thumbnailUrl: thumbnail,
    views: views,
    age: age
  };
}

// Function to handle video clicks
function setupVideoClickListeners() {
  // Target all video thumbnails on YouTube
  let videoElements = document.querySelectorAll('a#thumbnail');
  if (videoElements.length === 0) {
    console.log("No video elements found on the page.");
    return;
  }
  console.log("Video elements found:", videoElements.length);
  videoElements.forEach(videoElement => {
    // Check if we've already added a listener to this element
    if (!videoElement.hasAttribute('data-click-listener')) {
      videoElement.setAttribute('data-click-listener', 'true');
      const videoContainer = videoElement.closest('ytd-rich-item-renderer, ytd-compact-video-renderer, ytd-video-renderer');
      if (!videoContainer) {
        console.log("No video container found for this element.");
        return;
      }
      const videoData = extractMetadata(videoContainer as HTMLElement);
      browser.runtime.sendMessage({
        action: "videoElementFound",
        data: videoData
      }, response => {
        if (response.status == "success") {
          console.log("Get response from background:", response);
          const thumbNode = videoContainer.querySelector('ytd-thumbnail a#thumbnail yt-image img') as HTMLImageElement;
          if (response.data.score > 5) {
            thumbNode.src = "https://openclipart.org/image/2400px/svg_to_png/28688/skotan-Thumbs-up-smiley.png"
          } else {
            thumbNode.src = "https://openclipart.org/image/2400px/svg_to_png/63433/Thumbs-down-smiley2.png"
          }
        } else {
          console.log("Failed to get response from background:", response);
        }
      })
    }
  });
}


export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  main(ctx) {
    console.log("YouTube Click Listener content script loaded");
    setupVideoClickListeners();


    // Also run when the page content changes (for dynamic loading)
    const observer = new MutationObserver(() => {
      setupVideoClickListeners();
    });

    // Start observing changes to the document body
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  },
});
