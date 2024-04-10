importScripts('./lib/stateHelpers.js');

// click on extension listener
chrome.action.onClicked.addListener(async (tab) => {
    const tabs = await chrome.tabs.query({});
    // check if extension is on or off
    state = await getState();
    if (!state || state == 'OFF') {
        await setState('ON')
        state = 'ON';
    } else {
        await setState('OFF')
        state = 'OFF';
    }
    // group
    if (state == 'ON') {
        for (const tab of tabs) {
            await groupTab(tab);
        }
    // ungroup
    } else {
        for (const tab of tabs) {
            await setState('OFF');
            await chrome.tabs.ungroup(tab.id);
        }
    }
});

// restore badge text on browser start
chrome.runtime.onStartup.addListener(async() => {
    await restoreState();
});

// tab update listener
chrome.tabs.onUpdated.addListener(async(tabId, changeInfo, tab) => {
    // refresh
    if (changeInfo.status === 'loading' && changeInfo.url === undefined) {
        await restoreState();
    }
    // new site
    else if (changeInfo.url) {
        state = await getState();
        // group if necessary
        if (state == 'ON') {
            await groupTab(tab);
        }
    }
});

// get tab's domain
function getTabDomain(tab) {
    var url = new URL(tab.url);
    var hostname = url.hostname;
    // remove subdomain and top level domain (TLD) if present
    var parts = hostname.split('.');
    // subdomain
    if (parts.length > 2) { 
        parts.shift();
    }
    // TLD
    if (parts.length > 1) {
        parts.pop();
    }
    // rejoin domain
    var domain = parts.join('.');
    return domain;
}

// add tab to domain group
async function groupTab(tab) {
    try {
        await setState('ON');
        const domain = getTabDomain(tab);
        // check for pinned tab or new tab
        if (tab.pinned || domain == 'newtab') {
            return false;
        }
        // check for existing group within current window
        const groups = await chrome.tabGroups.query({ windowId: tab.wndowId, title: domain});
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
            const tabs = await chrome.tabs.query({ windowId: tab.windowId });
            let tabIds = [];
            // move group to front of non-pinned tabs
            let frontIndex = 0;
            for (const tempTab of tabs) {
                if (tempTab.pinned) {
                    frontIndex++;
                }
                else if (getTabDomain(tempTab) == domain) {
                    tabIds.push(tempTab.id);
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
    } catch (error) {
        console.log(error);
        return false;
    }
}