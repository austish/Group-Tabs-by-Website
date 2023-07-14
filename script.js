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
    // check if extension is 'ON' or 'OFF'
    const prevState = currentState;
    // Next state will always be the opposite
    currentState = prevState === 'ON' ? 'OFF' : 'ON'

    //get tabs
    const tabs = await chrome.tabs.query({});
    // set action badge
    for (const tab of tabs) {
        chrome.action.setBadgeText({ tabId: tab.id, text: currentState });
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
            const group = await chrome.tabs.group({ tabIds });
            await chrome.tabGroups.update(group, { title: key });
        }
    // ungroup tabs
    } else if (currentState === "OFF") {
        chrome.tabs.query({}, tabs => {
            for (const tab of tabs) {
                chrome.tabs.ungroup(tab.id);
            }
        });
    }
});

// add new tabs to groups
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && currentState == 'ON') {
        await chrome.action.setBadgeText({ tabId: tab.id, text: currentState });
        await chrome.tabs.get(tabId, function(tab) {
            const domain = getTabDomain(tab);
            addTabToGroup(domain, tab);            
        }); 
    }
});

function getTabDomain(tab) {
    let domain = ''
    if (typeof tab !== 'undefined') {
        // get tab title
        const title = tab.title.split("-")[0].trim();
        // get tab domain hostname
        domain = new URL(tab.url);
        domain = domain.hostname;
        // remove www.
        if (domain.startsWith('www.')) {
            domain = domain.replace('www.', '');
        }
        // remove domain extensions
        if (domain.endsWith('.com') || domain.endsWith('.org') || domain.endsWith('.gov')) {
            domain = domain.slice(0, -4);
        }
    }
    return domain;
}
  
async function addTabToGroup(groupName, tab) {
    // Check if a group with this name already exists
    await chrome.tabGroups.query({title: groupName}, function(groups) {
        // add to existing group
        if (groups.length > 0) {
            var groupId = groups[0].id;
            chrome.tabs.group({ tabIds: tab.id, groupId: groupId });
        // add to new group
        } else {
            const group = chrome.tabs.group({ tabIds: tab.id });
            // chrome.tabGroups.update(group.id, { title: groupName });
        }
    });
} 