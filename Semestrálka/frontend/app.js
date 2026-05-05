const backendUrl = window.location.origin;
let token = null;

const statusEl = document.getElementById("status");
const listEl = document.getElementById("list");
const loginSection = document.getElementById("login-section");
const appSection = document.getElementById("app");
const loginForm = document.getElementById("login-form");
const welcomeText = document.getElementById("welcome-text");
const addPoiBtn = document.getElementById("add-poi-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const filterButton = document.getElementById("filter-button");
const filterPanel = document.getElementById("filter-panel");

console.log('Semestrálka frontend loaded');
console.log('filterButton', filterButton);

let map = null;
let markersLayer = null;
let editingKey = null;
let poisByKey = {};
let currentPois = [];
const sortAffiliationOrder = ["Friend", "Neutral", "Foe"];
const hiddenPOIs = new Set();
const affiliationMapFilter = { Friend: true, Neutral: true, Foe: true };

window.toggleFilterMenu = toggleFilterMenu;
window.toggleAffiliationFilter = toggleAffiliationFilter;
window.hidePoi = hidePoi;
window.startEditPoi = startEditPoi;
window.deletePoi = deletePoi;
window.addPoi = addPoi;
window.cancelEdit = cancelEdit;

if (filterButton) {
    filterButton.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleFilterMenu();
    });
}

function setStatus(text, isError = false) {
    statusEl.textContent = text;
    statusEl.style.color = isError ? "#b00" : "#080";
}

function buildApiUrl(path) {
    const trimmed = path.startsWith("/") ? path.slice(1) : path;
    return `${backendUrl}/${trimmed}`;
}

function getAuthHeaders() {
    return token ? { "Content-Type": "application/json", "x-token": token } : { "Content-Type": "application/json" };
}

function initMap() {
    if (map) return;

    map = L.map("map").setView([49.743, 15.338], 9);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
}

async function loadPOIs() {
    setStatus("Loading POIs...");

    try {
        const res = await fetch(buildApiUrl("api/pois"), {
            headers: getAuthHeaders()
        });
        if (!res.ok) {
            throw new Error(`backend returned ${res.status}`);
        }

        const data = await res.json();
        currentPois = Array.isArray(data) ? data : [];
        renderPOIs(currentPois);
        setStatus("Loaded POIs from database.");
    } catch (err) {
        setStatus(`Unable to load POIs: ${err.message}`, true);
        listEl.innerHTML = "";
    }
}

function hideAllActionMenus() {
    document.querySelectorAll('.action-menu').forEach(menu => {
        menu.style.display = 'none';
    });
}

function toggleActions(key) {
    hideAllActionMenus();
    const menu = document.getElementById(`actions-${key}`);
    if (!menu) return;
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function toggleFilterMenu() {
    if (!filterPanel) return;
    filterPanel.style.display = filterPanel.style.display === 'block' ? 'none' : 'block';
}

function toggleAffiliationFilter(affiliation, input) {
    affiliationMapFilter[affiliation] = Boolean(input.checked);
    renderPOIs(currentPois);
}

function hidePoi(key) {
    hideAllActionMenus();
    if (hiddenPOIs.has(key)) {
        hiddenPOIs.delete(key);
        setStatus('POI shown on map.');
    } else {
        hiddenPOIs.add(key);
        setStatus('POI hidden from map.');
    }
    renderPOIs(currentPois);
}

if (listEl) {
    listEl.addEventListener('click', (event) => {
        let target = event.target;
        while (target && target.nodeType !== Node.ELEMENT_NODE) {
            target = target.parentNode;
        }
        if (!(target instanceof Element)) return;

        const actionButton = target.closest('.action-btn');
        if (actionButton) {
            const key = actionButton.dataset.key;
            if (key) toggleActions(key);
            return;
        }

        const menuButton = target.closest('[data-action]');
        if (menuButton) {
            const action = menuButton.dataset.action;
            const key = menuButton.dataset.key;
            if (!action || !key) return;
            event.stopPropagation();
            if (action === 'hide') hidePoi(key);
            if (action === 'modify') startEditPoi(key);
            if (action === 'delete') deletePoi(key);
            return;
        }
    });
}

window.addEventListener('click', (event) => {
    let target = event.target;
    while (target && target.nodeType !== Node.ELEMENT_NODE) {
        target = target.parentNode;
    }
    if (!(target instanceof Element)) {
        return;
    }
    if (!target.closest('.poi-actions') && !target.closest('#filter-panel') && !target.closest('#filter-button')) {
        hideAllActionMenus();
        if (filterPanel) {
            filterPanel.style.display = 'none';
        }
    }
});

function renderPOIs(data) {
    listEl.innerHTML = "";
    markersLayer.clearLayers();

    const entries = Array.isArray(data)
        ? data.map((poi) => ({ ...poi, _key: String(poi.id) }))
        : [];
    entries.sort((a, b) => {
        const aIndex = sortAffiliationOrder.indexOf(a.affiliation);
        const bIndex = sortAffiliationOrder.indexOf(b.affiliation);
        if (aIndex !== bIndex) {
            return aIndex - bIndex;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
    if (entries.length === 0) {
        listEl.textContent = "No POIs found.";
        return;
    }

    poisByKey = {};
    const bounds = [];
    let visibleItems = 0;

    entries.forEach(p => {
            poisByKey[p._key] = p;

            const isHidden = hiddenPOIs.has(p._key);
            const isFilteredHidden = !(affiliationMapFilter[p.affiliation] ?? true);
            const showOnMap = !isFilteredHidden && !isHidden;
            const div = document.createElement("div");
            const keyClass = `poi-${(p.affiliation || "Neutral").toLowerCase()}`;
            div.className = `poi-item ${keyClass}${isHidden ? " hidden-poi" : ""}${isFilteredHidden ? " filter-hidden" : ""}${showOnMap ? "" : " map-hidden"}`;
            div.innerHTML = `
                <div class="poi-header">
                    <div class="poi-text">
                        <strong>${p.name}</strong> <span>(${p.affiliation})</span>
                        <div class="poi-coords">[${p.lat}, ${p.lon}]</div>
                        ${isHidden ? '<div class="poi-hidden-note">Hidden from map</div>' : ''}
                    </div>
                    <div class="poi-actions">
                        ${isFilteredHidden ? '<span class="filter-hidden-icon" title="Hidden by filter"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-4.97 0-9-3.58-9-8 0-1.72.53-3.33 1.44-4.67"/><path d="M6.6 6.6A9.96 9.96 0 0 1 12 5c4.97 0 9 3.58 9 8 0 1.38-.35 2.69-.96 3.83"/><path d="M1 1l22 22"/></svg></span>' : ''}
                        <button class="action-btn" type="button">⋮</button>
                        <div class="action-menu" id="actions-${p._key}">
                            <button type="button" class="hide-btn">${isHidden ? 'Show' : 'Hide'}</button>
                            <button type="button" class="modify-btn">Modify</button>
                            <button class="delete-btn" type="button">Delete</button>
                        </div>
                    </div>
                </div>
            `;
        const actionBtn = div.querySelector('.action-btn');
        const actionMenu = div.querySelector('.action-menu');
        const hideBtn = div.querySelector('.hide-btn');
        const modifyBtn = div.querySelector('.modify-btn');
        const deleteBtn = div.querySelector('.delete-btn');

        if (actionBtn && actionMenu) {
            actionBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                actionMenu.style.display = actionMenu.style.display === 'block' ? 'none' : 'block';
            });
        }
        if (hideBtn) {
            hideBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                hidePoi(p._key);
            });
        }
        if (modifyBtn) {
            modifyBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                startEditPoi(p._key);
            });
        }
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                deletePoi(p._key);
            });
        }

        listEl.appendChild(div);
        visibleItems += 1;

        const lat = Number(p.lat);
        const lon = Number(p.lon);
        if (!Number.isNaN(lat) && !Number.isNaN(lon) && showOnMap) {
            const iconName = (p.affiliation || "Neutral").toLowerCase();
            const iconUrl = `icons/${iconName}/default.png`;
            const poiIcon = L.icon({
                iconUrl,
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -28],
            });
            const marker = L.marker([lat, lon], { icon: poiIcon });
            marker.bindPopup(`<strong>${p.name}</strong><br>${p.affiliation}`);
            marker.addTo(markersLayer);
            bounds.push([lat, lon]);
        }
    });

    if (visibleItems === 0) {
        listEl.textContent = "No POIs found.";
    }

    if (bounds.length) {
        map.fitBounds(bounds, { padding: [40, 40] });
    }
}


async function addPoi() {
    const name = document.getElementById("name").value.trim();
    const lat = parseFloat(document.getElementById("lat").value);
    const lon = parseFloat(document.getElementById("lon").value);
    const affiliation = document.getElementById("affiliation").value;

    if (!name || Number.isNaN(lat) || Number.isNaN(lon)) {
        setStatus("Please enter valid name and coordinates.", true);
        return;
    }

    const poi = { name, lat, lon, affiliation };
    const method = editingKey ? "PUT" : "POST";
    const endpoint = editingKey ? `api/pois/${editingKey}` : "api/pois";
    setStatus(editingKey ? "Updating POI..." : "Saving POI...");

    try {
        const res = await fetch(buildApiUrl(endpoint), {
            method,
            headers: getAuthHeaders(),
            body: JSON.stringify(poi)
        });

        if (!res.ok) throw new Error(`backend returned ${res.status}`);

        const wasEditing = Boolean(editingKey);
        clearEditState();
        document.getElementById("name").value = "";
        document.getElementById("lat").value = "";
        document.getElementById("lon").value = "";
        document.getElementById("affiliation").value = "Friend";

        await loadPOIs();
        setStatus(wasEditing ? "Updated POI successfully." : "Saved POI successfully.");
    } catch (err) {
        setStatus(`Unable to save POI: ${err.message}`, true);
    }
}

function clearEditState() {
    editingKey = null;
    addPoiBtn.textContent = "Add POI";
    cancelEditBtn.style.display = "none";
}

function startEditPoi(key) {
    hideAllActionMenus();
    const poi = poisByKey[key];
    if (!poi) return;

    document.getElementById("name").value = poi.name || "";
    document.getElementById("lat").value = poi.lat || "";
    document.getElementById("lon").value = poi.lon || "";
    document.getElementById("affiliation").value = poi.affiliation || "Friend";
    editingKey = key;
    addPoiBtn.textContent = "Save Changes";
    cancelEditBtn.style.display = "inline-flex";
    setStatus(`Editing ${poi.name}.`);
}

function cancelEdit() {
    clearEditState();
    document.getElementById("name").value = "";
    document.getElementById("lat").value = "";
    document.getElementById("lon").value = "";
    document.getElementById("affiliation").value = "Friend";
    setStatus("Edit cancelled.");
}

function showApp() {
    loginSection.style.display = "none";
    appSection.style.display = "block";
    if (welcomeText) {
        welcomeText.style.display = 'block';
    }
    initMap();
    loadPOIs();
}

async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById("login-user").value.trim();
    const password = document.getElementById("login-pass").value;

    try {
        const res = await fetch(`${backendUrl}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        if (res.ok && data.token) {
            token = data.token;
            setStatus("Login successful.");
            if (welcomeText) {
                welcomeText.textContent = `Welcome, ${username}!`;
                welcomeText.style.display = 'block';
            }
            showApp();
        } else {
            setStatus(data.error || "Invalid login credentials.", true);
        }
    } catch (err) {
        setStatus(`Login failed: ${err.message}`, true);
    }
}

loginForm.addEventListener("submit", handleLogin);

async function deletePoi(key) {
    hideAllActionMenus();
    if (!confirm("Delete this POI?")) return;

    try {
        const res = await fetch(buildApiUrl(`api/pois/${key}`), {
            method: "DELETE",
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error(`backend returned ${res.status}`);

        if (editingKey === key) {
            clearEditState();
        }

        await loadPOIs();
        setStatus("Deleted POI successfully.");
    } catch (err) {
        setStatus(`Unable to delete POI: ${err.message}`, true);
    }
}
