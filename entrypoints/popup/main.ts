declare const aiProviderSelection: HTMLSelectElement;
declare const saveErrorMsg: HTMLParagraphElement;
declare const lmStudioForm: HTMLFormElement;
declare const googleForm: HTMLFormElement;
declare const save: HTMLButtonElement
declare const apiKeyInput: HTMLInputElement;
declare const baseUrlInput: HTMLInputElement;


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

save.addEventListener("click", function () {
    saveErrorMsg.hidden = true;
    const aiProvider = aiProviderSelection.value;
    let apiKey = "";
    let baseUrl = "";

    // TODO: customise prompt
    // TODO: customise model
    if (aiProvider === "google") {
        apiKey = apiKeyInput.value.trim();
        if (apiKey.length === 0) {
            saveErrorMsg.hidden = false;
            saveErrorMsg.innerText = "API Key is required for Google AI provider.";
            return;
        }
    } else if (aiProvider === "lmstudio") {
        baseUrl = baseUrlInput.value.trim();
        if (baseUrl.length === 0) {
            saveErrorMsg.hidden = false;
            saveErrorMsg.innerText = "LM Studio Base URL is required.";
            return;
        }
    }

    console.log("Sending AI config")
    // TODO: test this.
    browser.runtime.sendMessage({
        type: "save-ai-config",
        aiProvider: aiProvider,
        apiKey: apiKey,
        baseUrl: baseUrl
    }).then(() => {

    }).catch((error) => {

    });
})