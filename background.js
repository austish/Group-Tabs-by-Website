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
            if (tabIds.length > 1) {
                const group = await chrome.tabs.group({ tabIds });
                await chrome.tabGroups.update(group, { title: key });
                await chrome.tabGroups.move(group, { index: 0 })
            }
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
            await chrome.action.setBadgeText({ tabId: currentTab[0].id, text: 'ON' });
            const domain = getTabDomain(currentTab[0]);
            groupTab(domain, currentTab[0]);
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
        // add to new group only if domain has more than 1 tab
        const tabs = await chrome.tabs.query({});
        var domainTabs = {};
        for (const tab of tabs) {
            domain = getTabDomain(tab);
            if (!(domain in domainTabs)) {
                domainTabs[domain] = new Array();
            }
            domainTabs[domain].push(tab.id);
        }
        if (domainTabs[domain].length > 1) {
            const group = await chrome.tabs.group({ tabIds: Object.values(domainTabs[domain]) });
            await chrome.tabGroups.update(group, { title: domain });
            await chrome.tabGroups.move(group, { index: 0 })
            return true;
        }
        return false;
    }
}