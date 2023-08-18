// when clicking on extension icon
chrome.action.onClicked.addListener(async (tab) => {
    // check if extension is on or off
    const tabs = await chrome.tabs.query({});
    badgeText = await chrome.action.getBadgeText({ tabId: tabs[0].id });
    if (!badgeText || badgeText == 'OFF') {
        currentState = 'ON'
    } else {
        currentState = 'OFF'
    }
    // group
    if (currentState == 'ON') {
        for (const tab of tabs) {
            await groupTab(tab);
        }
    // ungroup
    } else {
        for (const tab of tabs) {
            await chrome.action.setBadgeText({ tabId: tab.id, text: currentState });
            await chrome.tabs.ungroup(tab.id);
        }
    }
});

// retrieve messages from content script
chrome.runtime.onMessage.addListener(async() => {
    const tabs = await chrome.tabs.query({ index: 0 });
    const badge = await chrome.action.getBadgeText({ tabId: tabs[0].id });
    // check if badge text is 'ON'
    if (badge == 'ON') {
        // group tab
        chrome.tabs.query({ active: true, currentWindow: true }, async(currentTab) => {
            await groupTab(currentTab[0]);
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
        const period = domain.lastIndexOf('.');
        if (period > -1) {
            domain = domain.slice(0, period - domain.length);
        }
    }
    return domain;
}

// finds index at front of tabs, accounting for pinned tabs
async function findFrontIndex() {
    let count = 0;
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
        if (tab.pinned) {
            count++;
        }
    }
    return count;
}

// add tab to domain group
async function groupTab(tab) {
    await chrome.action.setBadgeText({ tabId: tab.id, text: 'ON' });
    // check for pinned tab
    if (tab.pinned) {
        await chrome.action.setBadgeText({ tabId: tab.id, text: 'ON' });
        return false;
    }
    // check for new tab
    const domain = getTabDomain(tab);
    if (domain == 'newtab') {
        return false;
    }
    // check for existing group
    const groups = await chrome.tabGroups.query({title: domain});
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
        // check for multiple tabs with domain
        const tabs = await chrome.tabs.query({});
        let tabIds = [];
        // front of non-pinned tabs index 
        let frontIndex = 0;
        for (const temp_tab of tabs) {
            temp_domain = getTabDomain(temp_tab);
            if (temp_tab.pinned) {
                frontIndex++;
            }
            else if (temp_domain == domain) {
                tabIds.push(temp_tab.id);
            } 
        }
        // create new group if more than 1 tab with same domain
        if (tabIds.length > 1) {
            const group = await chrome.tabs.group({ tabIds: tabIds });
            await chrome.tabGroups.update(group, { title: domain });
            await chrome.tabGroups.move(group, { index: frontIndex });
            return true; 
        // ungroup if necessary    
        } else if (tab.groupId > 0) {
            await chrome.tabs.ungroup(tab.id);
        }
        return false;
    }
}