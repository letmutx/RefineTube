import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
    manifest: {
        permissions: ["scripting", "storage"],
        host_permissions: ["*://i.ytimg.com/*"]
    },
    webExt: {
        startUrls: ["https://youtube.com"],
    }
});
