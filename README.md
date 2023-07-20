# Group Tabs by Website
Chrome extension that automatically organizes tabs into groups according to their website.

![Screenshot 2023-07-18 232928](https://github.com/austish/Tabs-Manager/assets/67724520/9c0dbc9a-a602-431d-982f-e71d41126039)

Tried to do this, but group query in groupTab() was returning empty object.
<code>
for (const tab of tabs) {
    await chrome.action.setBadgeText({ tabId: tab.id, text: currentState });
    // group
    if (currentState === "ON") {
        domain = getTabDomain(tab);
        groupTab(domain, tab);
    // ungroup
    } else {
        await chrome.tabs.ungroup(tab.id);
    }
}
</code>

<br><br> 
