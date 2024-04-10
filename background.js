importScripts('stateHelpers.js');

// when clicking on extension icon
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

// retrieve messages from content script
chrome.runtime.onMessage.addListener(async(request) => {
    if (request.message == "newSite") {
        console.log("Message 'newSite' received");
        state = await getState();
        // check if badge text is 'ON'
        if (state == 'ON') {
            // group tab
            await chrome.tabs.query({ active: true, currentWindow: true }, async(currentTab) => {
                console.log(currentTab[0])
                await groupTab(currentTab[0]);
            });
        }
    }
});

// restore badge text on browser start
chrome.runtime.onStartup.addListener(async() => {
    await restoreState();
});

// tab update listener
chrome.tabs.onUpdated.addListener(async(tabId, changeInfo, tab) => {
    if (changeInfo.status == 'complete') {
        await restoreState();
    }
    console.log("Update listener triggered");
    // group tab if necessary
    // state = await getState();
    // if (state == 'ON') {
    //     chrome.tabs.query({ active: true, currentWindow: true }, async(currentTab) => {
    //         await groupTab(currentTab[0]);
    //     });
    // }
});

// // tab created listener
// chrome.tabs.onCreated.addListener(async(tab) => {
//     await restoreState();
//     // group tab if necessary
//     state = await getState();
//     if (state == 'ON') {
//         chrome.tabs.query({ active: true, currentWindow: true }, async(currentTab) => {
//             await groupTab(currentTab[0]);
//         });
//     }
// });

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
        await setState('ON');
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