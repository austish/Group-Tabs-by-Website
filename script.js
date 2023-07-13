// extension on or off
let currentState = 'OFF'

// set badge text to off at start
chrome.runtime.onInstalled.addListener(() => {
    chrome.action.setBadgeText({
      text: currentState,
    });
});

// click on extension icon
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
        for (const tab of tabs) {
            domain = getTabDomain(tab);
            // map domain to tab id
            if (!hostMap.has(domain)) {
                hostMap.set(domain, []);
            }
            hostMap.get(domain).push(tab.id);
        }

        // group tabs
        for (const [key, tabIds] of hostMap.entries()) {
            const group = await chrome.tabs.group({ tabIds });
                await chrome.tabGroups.update(group, { title: key });
        }
    } else if (currentState === "OFF") {
        chrome.tabs.query({}, tabs => {
            for (const tab of tabs) {
                chrome.tabs.ungroup(tab.id);
            }
        });
    }
});

// add new tabs to groups
chrome.tabs.onUpdated.addListener(async (tab, changeInfo) => {
    // console.log(chrome.action.getBadgeText({ tabId: tab.id }));
    if (changeInfo.status === 'complete' && currentState == 'ON') {
        await chrome.action.setBadgeText({ tabId: tab.id, text: currentState });
        try {
            domain = getTabDomain(tab);
            console.log(domain);
        } catch (error) {
            console.error(error);
        }
    }
});

// chrome.tabs.onUpdated.addListener(async (tab) => {
//     if (currentState == 'ON') {    
//         domain = getTabDomain(tab);
//         console.log(domain);
//         chrome.tabGroups.query({ title: domain }, function(groups) {
//             if (groups && groups.length > 0) {
//                 const groupId = groups[0].id;
//             }
//         })

//         // group tab
//         chrome.tabs.group({ tabIds: tab.id, groupId }, function(group) {
//             if (group) {
//                 // Tab added to the group successfully
//                 console.log(`Tab added to group with ID ${group.groupId}`);
//             } else {
//                 // Failed to add tab to the group
//                 console.log(`Failed to add tab to group with ID ${groupId}`);
//             }
//         });
//     }
// });

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

/////////////////
// action menu //
/////////////////

// const tabs = await chrome.tabs.query({});
// const collator = new Intl.Collator();
// tabs.sort((a, b) => collator.compare(a.title, b.title));

// const template = document.getElementById("li_template");
// const elements = new Set();
// const hostMap = new Map();

// for (const tab of tabs) {
//     // const element = template.content.firstElementChild.cloneNode(true);

//     // get tab title
//     const title = tab.title.split("-")[0].trim();
//     //get tab domain hostname
//     let domain = new URL(tab.url);
//     domain = domain.hostname;
//     // remove www.
//     if (domain.startsWith('www.')) {
//         domain = domain.replace('www.', '');
//     }
//     // remove domain extensions
//     if (domain.endsWith('.com') || domain.endsWith('.org') || domain.endsWith('.gov')) {
//         domain = domain.slice(0, -4);
//     }
//     //map domain to tab id
//     if (!hostMap.has(domain)) {
//         hostMap.set(domain, []);
//     }
//     hostMap.get(domain).push(tab.id);

//     // element.querySelector(".title").textContent = title;
//     // element.querySelector(".pathname").textContent = domain;
//     // element.querySelector("a").addEventListener("click", async () => {
//     //     // need to focus window as well as the active tab
//     //     await chrome.tabs.update(tab.id, { active: true });
//     //     await chrome.windows.update(tab.windowId, { focused: true });
//     // });

//     // elements.add(element);
// }
// add all tabs to extenion menu
// document.querySelector("ul").append(...elements);

// group button
// const groupBtn = document.getElementById("groupBtn");
// groupBtn.addEventListener("click", async () => {
//     for (const [key, tabIds] of hostMap.entries()) {
//         const group = await chrome.tabs.group({ tabIds });
//         await chrome.tabGroups.update(group, { title: key });
//     }
// });

// // ungroup button
// const ungroupBtn = document.getElementById("ungroupBtn");
// ungroupBtn.addEventListener("click", async () => {
//     chrome.tabs.query({}, tabs => {
//         for (const tab of tabs) {
//             chrome.tabs.ungroup(tab.id);
//         }
//     });
// });