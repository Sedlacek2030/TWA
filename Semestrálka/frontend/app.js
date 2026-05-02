const firebaseUrl = "https://semestralka-9a2bd-default-rtdb.europe-west1.firebasedatabase.app/"; // Replace with your Firebase DB URL.
const firebaseAuthToken = ""; // Optional: Firebase REST auth token if your rules require it.
let validUsers = [];
let userLoadError = false;

const baseUrl = firebaseUrl.endsWith("/") ? firebaseUrl : firebaseUrl + "/";
const statusEl = document.getElementById("status");
const listEl = document.getElementById("list");
const firebaseUrlEl = document.getElementById("firebase-url");
const loginSection = document.getElementById("login-section");
const appSection = document.getElementById("app");
const loginForm = document.getElementById("login-form");
const addPoiBtn = document.getElementById("add-poi-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");

let map = null;
let markersLayer = null;
let editingKey = null;
let poisByKey = {};

firebaseUrlEl.textContent = baseUrl;

function setStatus(text, isError = false) {
    statusEl.textContent = text;
    statusEl.style.color = isError ? "#b00" : "#080";
}

function buildFetchUrl(path) {
    if (!firebaseAuthToken) return `${baseUrl}${path}`;
    return `${baseUrl}${path}?auth=${encodeURIComponent(firebaseAuthToken)}`;
}

async function loadUsers() {
    try {
        const res = await fetch("users.json");
        if (!res.ok) throw new Error(`users.json returned ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("users.json must contain an array");
        validUsers = data
            .filter(u => u && typeof u.username === "string" && typeof u.password === "string")
            .map(u => ({ username: u.username, password: u.password }));
        if (validUsers.length === 0) throw new Error("users.json contains no valid users");
    } catch (err) {
        userLoadError = true;
        setStatus(`Unable to load users.json: ${err.message}`, true);
    }
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
        const res = await fetch(buildFetchUrl("pois.json"));
        if (!res.ok) {
            throw new Error(`Firebase returned ${res.status}`);
        }

        const data = await res.json();
        renderPOIs(data);
        setStatus("Loaded POIs from Firebase.");
    } catch (err) {
        setStatus(`Unable to load Firebase POIs: ${err.message}`, true);
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

window.addEventListener('click', (event) => {
    if (!event.target.closest('.poi-actions')) {
        hideAllActionMenus();
    }
});

function renderPOIs(data) {
    listEl.innerHTML = "";
    markersLayer.clearLayers();

    const entries = data == null ? [] : Array.isArray(data)
        ? data.map((poi, index) => ({ ...poi, _key: String(index) }))
        : Object.entries(data).map(([key, poi]) => ({ ...poi, _key: key }));
    if (entries.length === 0) {
        listEl.textContent = "No POIs found.";
        return;
    }

    poisByKey = {};
    const bounds = [];
    entries.forEach(p => {
        poisByKey[p._key] = p;
        const div = document.createElement("div");
        div.className = "poi-item";
        div.innerHTML = `
            <div class="poi-header">
                <div class="poi-text">
                    <strong>${p.name}</strong> <span>(${p.affiliation})</span>
                    <div class="poi-coords">[${p.lat}, ${p.lon}]</div>
                </div>
                <div class="poi-actions">
                    <button class="action-btn" type="button" onclick="toggleActions('${p._key}')">⋮</button>
                    <div class="action-menu" id="actions-${p._key}">
                        <button type="button" onclick="startEditPoi('${p._key}')">Modify</button>
                        <button type="button" onclick="deletePoi('${p._key}')">Delete</button>
                    </div>
                </div>
            </div>
        `;
        listEl.appendChild(div);

        const lat = Number(p.lat);
        const lon = Number(p.lon);
        if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
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
    const method = editingKey ? "PATCH" : "POST";
    const endpoint = editingKey ? `pois/${editingKey}.json` : "pois.json";
    setStatus(editingKey ? "Updating POI..." : "Saving POI...");

    try {
        const res = await fetch(buildFetchUrl(endpoint), {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(poi)
        });

        if (!res.ok) throw new Error(`Firebase returned ${res.status}`);

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
    initMap();
    loadPOIs();
}

function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById("login-user").value.trim();
    const password = document.getElementById("login-pass").value;

    if (userLoadError) {
        setStatus("Cannot log in until users.json is loaded successfully.", true);
        return;
    }

    const isValid = validUsers.some(user => user.username === username && user.password === password);
    if (isValid) {
        setStatus("Login successful.");
        showApp();
    } else {
        setStatus("Invalid login credentials.", true);
    }
}

loginForm.addEventListener("submit", handleLogin);

loadUsers();

async function deletePoi(key) {
    hideAllActionMenus();
    if (!confirm("Delete this POI?")) return;

    try {
        const res = await fetch(buildFetchUrl(`pois/${key}.json`), {
            method: "DELETE"
        });
        if (!res.ok) throw new Error(`Firebase returned ${res.status}`);

        if (editingKey === key) {
            clearEditState();
        }

        await loadPOIs();
        setStatus("Deleted POI successfully.");
    } catch (err) {
        setStatus(`Unable to delete POI: ${err.message}`, true);
    }
}
