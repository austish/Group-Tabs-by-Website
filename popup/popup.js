const tabs = await chrome.tabs.query({});
const collator = new Intl.Collator();
tabs.sort((a, b) => collator.compare(a.title, b.title));

const template = document.getElementById("li_template");
const elements = new Set();
const hostMap = new Map();

for (const tab of tabs) {
    const element = template.content.firstElementChild.cloneNode(true);

    // get tab title
    const title = tab.title.split("-")[0].trim();
    //get tab domain hostname
    let domain = new URL(tab.url);
    domain = domain.hostname;
    // remove www.
    if (domain.startsWith('www.')) {
        domain = domain.replace('www.', '');
    }
    // remove domain extensions
    if (domain.endsWith('.com') || domain.endsWith('.org') || domain.endsWith('.gov')) {
        domain = domain.slice(0, -4);
    }
    //map domain to tab id
    if (!hostMap.has(domain)) {
        hostMap.set(domain, []);
    }
    hostMap.get(domain).push(tab.id);

    element.querySelector(".title").textContent = title;
    element.querySelector(".pathname").textContent = domain;
    element.querySelector("a").addEventListener("click", async () => {
        // need to focus window as well as the active tab
        await chrome.tabs.update(tab.id, { active: true });
        await chrome.windows.update(tab.windowId, { focused: true });
    });

    elements.add(element);
}
// add all tabs to extenion menu
document.querySelector("ul").append(...elements);

// group button
const groupBtn = document.getElementById("groupBtn");
groupBtn.addEventListener("click", async () => {
    for (const [key, tabIds] of hostMap.entries()) {
        const group = await chrome.tabs.group({ tabIds });
        await chrome.tabGroups.update(group, { title: key });
    }
});

// ungroup button
const ungroupBtn = document.getElementById("ungroupBtn");
ungroupBtn.addEventListener("click", async () => {
    chrome.tabs.query({}, tabs => {
        for (const tab of tabs) {
            chrome.tabs.ungroup(tab.id);
        }
    });
});

// https://www.google.com/s2/favicons?domain=stackoverflow.com&sz=128