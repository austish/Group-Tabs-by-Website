(async () => {
    const response = await chrome.runtime.sendMessage("new_site");
})();