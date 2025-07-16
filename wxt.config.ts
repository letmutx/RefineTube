import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
    manifest: {
        name: "RefineTube",
        description: "RefineTube is a browser extension that helps control your YouTube usage by providing AI-powered video ratings.",
        permissions: ["scripting", "storage"],
        host_permissions: ["*://i.ytimg.com/*"]
    },
    webExt: {
        startUrls: ["https://youtube.com"],
    }
});
