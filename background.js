// extension on or off
let currentState = 'OFF'

// when clicking on extension icon
chrome.action.onClicked.addListener(async (tab) => {
    // update state
    const prevState = currentState;
    currentState = prevState === 'ON' ? 'OFF' : 'ON'
    //get tabs
    const tabs = await chrome.tabs.query({});
    // group
    if (currentState === "ON") {
        var domainTabs = {};
        for (const tab of tabs) {
            await chrome.action.setBadgeText({ tabId: tab.id, text: currentState });
            domain = getTabDomain(tab);
            if (!(domain in domainTabs)) {
                domainTabs[domain] = new Array();
            }
            domainTabs[domain].push(tab.id);
        }
        for (const [key, tabIds] of Object.entries(domainTabs)) {
            const group = await chrome.tabs.group({ tabIds });
            await chrome.tabGroups.update(group, { title: key });
        }
    // ungroup
    } else {
        for (const tab of tabs) {
            await chrome.action.setBadgeText({ tabId: tab.id, text: currentState });
            await chrome.tabs.ungroup(tab.id);
        }
    }
});

// add new tabs to groups while background.js is active
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (currentState == 'ON' && changeInfo.status === "loading") {
        await chrome.action.setBadgeText({ tabId: tab.id, text: currentState });
        await chrome.tabs.get(tabId, function(tab) {
            const domain = getTabDomain(tab);
            groupTab(domain, tab);
        }); 
    }
});

// retrieve messages from content script
chrome.runtime.onMessage.addListener(async() => {
    const tabs = await chrome.tabs.query({});
    const badge = await chrome.action.getBadgeText({ tabId: tabs[0].id });
    // check if badge text is 'ON'
    if (badge == 'ON') {
        // group tab
        chrome.tabs.query({ active: true, currentWindow: true }, async(tabs) => {
            await chrome.action.setBadgeText({ tabId: tabs[0].id, text: 'ON' });
            const domain = getTabDomain(tabs[0]);
            groupTab(domain, tabs[0]);
        });
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
    // check for new tab
    if (domain == 'newtab') {
        await chrome.tabs.move(tab.id, { index: -1 });
        return false;
    }
    // check for existing group
    const groups = await chrome.tabGroups.query({title: domain});
    console.log(groups);
    if (groups.length > 0) {
        // check if tab is already in group
        if (tab.groupId == groups[0].id) {
            return false;
        } else {
            // add tab to existing group;
            await chrome.tabs.group({ tabIds: tab.id, groupId: groups[0].id });
            return true;
        }
    } else {
        // add to new group
        console.log("adding to new group");
        const group = await chrome.tabs.group({ tabIds: tab.id });
        await chrome.tabGroups.update(group, { title: domain });
        return true;
    }
}