// extension on or off
let currentState = 'OFF'

// set badge text to off at start
chrome.runtime.onInstalled.addListener(() => {
    chrome.action.setBadgeText({
      text: currentState,
    });
});

// when clicking on extension icon
chrome.action.onClicked.addListener(async (tab) => {
    // update state
    const prevState = currentState;
    currentState = prevState === 'ON' ? 'OFF' : 'ON'
    //get tabs
    const tabs = await chrome.tabs.query({});
    // set action badge
    for (const tab of tabs) {
        await chrome.action.setBadgeText({ tabId: tab.id, text: currentState });
    }

    if (currentState === "ON") {
        const hostMap = new Map();
        // map domain to tab id
        for (const tab of tabs) {
            domain = getTabDomain(tab);
            if (!hostMap.has(domain)) {
                hostMap.set(domain, []);
            }
            hostMap.get(domain).push(tab.id);
        }
        // group tabs
        for (const [key, tabIds] of hostMap.entries()) {
            // create group
            if (key != 'newtab') {
                const group = await chrome.tabs.group({ tabIds });
                await chrome.tabGroups.update(group, { title: key });
            // move new tabs to far right
            } else {
                chrome.tabs.move(tabIds, { index: -1 });
            }
        }
    // ungroup tabs
    } else if (currentState === "OFF") {
        for (const tab of tabs) {
            chrome.tabs.ungroup(tab.id);
        }
    }
});

// get tab's domain name
function getTabDomain(tab) {
    let domain = ''
    if (typeof tab !== 'undefined') {
        // get tab domain hostname
        domain = new URL(tab.url);
        domain = domain.hostname;
        // remove www.
        if (domain.startsWith('www.')) {
            domain = domain.replace('www.', '');
        }
        // remove domain extensions
        if (domain[domain.length - 4] == '.') {
            domain = domain.slice(0, -4);
        }
    }
    return domain;
}

// add tab to domain group
async function groupTab(domain, tab) {
    // check for group
    const groups = await chrome.tabGroups.query({title: domain});
    if (groups.length > 0) {
        // check if tab is already in group
        if (tab.groupId == groups[0].id) {
            return false;
        }
        // add tab to existing group;
        chrome.tabs.group({ tabIds: tab.id, groupId: groups[0].id });
        return true;
    } else {
        // add to new group
        const group = await chrome.tabs.group({ tabIds: tab.id });
        await chrome.tabGroups.update(group, { title: domain });
        return true;
    }
}

// retrieve messages from content script
chrome.runtime.onMessage.addListener(async() => {
        // check if extension is on
        const tabs = await chrome.tabs.query({});
        const state = await chrome.action.getBadgeText({ tabId: tabs[0].id });
        console.log(state);
        if (state == 'ON') {
            // group tab
            chrome.tabs.query({ active: true, currentWindow: true }, async(tabs) => {
                await chrome.action.setBadgeText({ tabId: tabs[0].id, text: 'ON' });
                const domain = getTabDomain(tabs[0]);
                groupTab(domain, tabs[0]);
            });
        }
    }
);