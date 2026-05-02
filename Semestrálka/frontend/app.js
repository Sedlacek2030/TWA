const firebaseUrl = "https://semestralka-9a2bd-default-rtdb.europe-west1.firebasedatabase.app/"; // Replace with your Firebase DB URL.
const firebaseAuthToken = ""; // Optional: Firebase REST auth token if your rules require it.
const validUsername = "admin";
const validPassword = "1234";

const baseUrl = firebaseUrl.endsWith("/") ? firebaseUrl : firebaseUrl + "/";
const statusEl = document.getElementById("status");
const listEl = document.getElementById("list");
const firebaseUrlEl = document.getElementById("firebase-url");
const loginSection = document.getElementById("login-section");
const appSection = document.getElementById("app");
const loginForm = document.getElementById("login-form");
const addPoiBtn = document.getElementById("add-poi-btn");

let map = null;
let markersLayer = null;

firebaseUrlEl.textContent = baseUrl;

function setStatus(text, isError = false) {
    statusEl.textContent = text;
    statusEl.style.color = isError ? "#b00" : "#080";
}

function buildFetchUrl(path) {
    if (!firebaseAuthToken) return `${baseUrl}${path}`;
    return `${baseUrl}${path}?auth=${encodeURIComponent(firebaseAuthToken)}`;
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

function renderPOIs(data) {
    listEl.innerHTML = "";
    markersLayer.clearLayers();

    const entries = data == null ? [] : Array.isArray(data) ? data : Object.values(data);
    if (entries.length === 0) {
        listEl.textContent = "No POIs found.";
        return;
    }

    const bounds = [];
    entries.forEach(p => {
        const div = document.createElement("div");
        div.className = "poi-item";
        div.innerHTML = `
            <strong>${p.name}</strong> <span>(${p.affiliation})</span><br>
            [${p.lat}, ${p.lon}]
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
    setStatus("Saving POI...");

    try {
        const res = await fetch(buildFetchUrl("pois.json"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(poi)
        });

        if (!res.ok) throw new Error(`Firebase returned ${res.status}`);

        document.getElementById("name").value = "";
        document.getElementById("lat").value = "";
        document.getElementById("lon").value = "";
        document.getElementById("affiliation").value = "Friend";

        await loadPOIs();
        setStatus("Saved POI successfully.");
    } catch (err) {
        setStatus(`Unable to save POI: ${err.message}`, true);
    }
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

    if (username === validUsername && password === validPassword) {
        setStatus("Login successful.");
        showApp();
    } else {
        setStatus("Invalid login credentials.", true);
    }
}

loginForm.addEventListener("submit", handleLogin);
