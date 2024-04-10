// set badge text
async function setState(text) {
    await chrome.action.setBadgeText({text: text});
    // save the text in chrome's local storage
    await chrome.storage.local.set({badgeText: text});
}

// get badge text
async function getState() {
    state = await chrome.storage.local.get('badgeText');
    return state.badgeText;
}

// retrieve and set badge text
async function restoreState() {
    await chrome.storage.local.get('badgeText', function(data) {
        if (data.badgeText) {
            chrome.action.setBadgeText({text: data.badgeText});
        }
    });
}