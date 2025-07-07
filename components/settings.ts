import { settingsStorage } from "../utils/settings";

declare const aiProviderSelection: HTMLSelectElement;
declare const saveErrorMsg: HTMLParagraphElement;
declare const status: HTMLParagraphElement
declare const lmStudioForm: HTMLFormElement;
declare const googleForm: HTMLFormElement;
declare const save: HTMLButtonElement;
declare const apiKeyInput: HTMLInputElement;
declare const baseUrlInput: HTMLInputElement;

settingsStorage.watch(settings => {
    if (settings === undefined || settings == null) {
        status.innerText = "Not configured yet. Please select an AI provider.";
        return
    }
    status.innerText = `Current AI provider: ${settings.provider}`;
})

aiProviderSelection.addEventListener("change", function (event) {
    saveErrorMsg.hidden = true;
    if ((event.target as HTMLInputElement).value === "lmstudio") {
        lmStudioForm.hidden = false;
        googleForm.hidden = true;
    } else {
        lmStudioForm.hidden = true;
        googleForm.hidden = false;
    }
})

save.addEventListener("click", async () => {
    saveErrorMsg.hidden = true;
    const aiProvider = aiProviderSelection.value;

    // TODO: customise prompt
    // TODO: customise model
    switch (aiProvider) {
        case "google":
            const apiKey = apiKeyInput.value.trim();
            if (apiKey.length === 0) {
                saveErrorMsg.hidden = false;
                saveErrorMsg.innerText = "API Key is required for Google AI provider.";
                return;
            } else {
                await settingsStorage.setValue({
                    provider: aiProvider,
                    apiKey: apiKey,
                })
            }
            break;
        case "lmstudio":
            const baseUrl = baseUrlInput.value.trim();
            if (baseUrl.length === 0) {
                saveErrorMsg.hidden = false;
                saveErrorMsg.innerText = "LM Studio Base URL is required.";
                return;
            } else {
                await settingsStorage.setValue({
                    provider: 'lmstudio',
                    baseUrl: baseUrl
                })
            }
    }
})