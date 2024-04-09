// set badge text
async function setBadgeText(text) {
    await chrome.action.setBadgeText({text: text});
    // save the text in chrome's local storage
    await chrome.storage.local.set({badgeText: text});
}

// get badge text
async function getBadgeText() {
    badge = await chrome.storage.local.get('badgeText');
    return badge.badgeText;
}

// retrieve and set badge text
async function restoreBadgeText() {
    await chrome.storage.local.get('badgeText', function(data) {
        if (data.badgeText) {
            chrome.action.setBadgeText({text: data.badgeText});
        }
    });
}