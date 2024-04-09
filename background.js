importScripts('badgeHelpers.js');

// when clicking on extension icon
chrome.action.onClicked.addListener(async (tab) => {
    const tabs = await chrome.tabs.query({});
    // check if extension is on or off
    badgeText = await getBadgeText();
    if (!badgeText || badgeText == 'OFF') {
        await setBadgeText('ON')
        badgeText = 'ON';
    } else {
        await setBadgeText('OFF')
        badgeText = 'OFF';
    }
    // group
    if (badgeText == 'ON') {
        for (const tab of tabs) {
            await groupTab(tab);
        }
    // ungroup
    } else {
        for (const tab of tabs) {
            await setBadgeText('OFF');
            await chrome.tabs.ungroup(tab.id);
        }
    }
});

// retrieve messages from content script
chrome.runtime.onMessage.addListener(async() => {
    badgeText = getBadgeText();
    // check if badge text is 'ON'
    if (badgeText == 'ON') {
        // group tab
        chrome.tabs.query({ active: true, currentWindow: true }, async(currentTab) => {
            await groupTab(currentTab[0]);
        });
    }
});

// restore badge text on browser start
chrome.runtime.onStartup.addListener(async() => {
    await restoreBadgeText();
});

// tab update listener
chrome.tabs.onUpdated.addListener(async(tabId, changeInfo, tab) => {
    if (changeInfo.status == 'complete') {
        await restoreBadgeText();
    }
    // group tab if necessary
    badgeText = await getBadgeText();
    if (badgeText == 'ON') {
        chrome.tabs.query({ active: true, currentWindow: true }, async(currentTab) => {
            await groupTab(currentTab[0]);
        });
    }
});

// get tab's domain
function getTabDomain(tab) {
    var url = new URL(tab.url);
    var hostname = url.hostname;

    // split the hostname into parts
    var parts = hostname.split('.');
    // remove subdomain if present
    if (parts.length > 2) {
        // Remove the subdomain
        parts.shift();
    }
    // remove top level domain (TLD) if present
    if (parts.length > 1) {
        parts.pop();
    }
    // complete domain
    var domain = parts.join('.');
    return domain;
}

// add tab to domain group
async function groupTab(tab) {
    try {
        await setBadgeText('ON');
        // check for pinned tab
        if (tab.pinned) {
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
    } catch (error) {
        console.log(error);
        return false;
    }
}