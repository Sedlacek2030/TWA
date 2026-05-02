const firebaseUrl = "https://semestralka-9a2bd-default-rtdb.europe-west1.firebasedatabase.app/"; // Replace with your Firebase DB URL.

const baseUrl = firebaseUrl.endsWith("/") ? firebaseUrl : firebaseUrl + "/";
const statusEl = document.getElementById("status");
const listEl = document.getElementById("list");
const firebaseUrlEl = document.getElementById("firebase-url");

firebaseUrlEl.textContent = baseUrl;

function setStatus(text, isError = false) {
    statusEl.textContent = text;
    statusEl.style.color = isError ? "#b00" : "#080";
}

async function loadPOIs() {
    setStatus("Loading POIs...");

    try {
        const res = await fetch(`${baseUrl}pois.json`);
        if (!res.ok) throw new Error(`Firebase returned ${res.status}`);

        const data = await res.json();
        renderPOIs(data);
        setStatus("Loaded POIs.");
    } catch (err) {
        setStatus(`Unable to load POIs: ${err.message}`, true);
        listEl.innerHTML = "";
    }
}

function renderPOIs(data) {
    listEl.innerHTML = "";

    if (!data) {
        listEl.textContent = "No POIs found in Firebase.";
        return;
    }

    const entries = Object.values(data);
    if (entries.length === 0) {
        listEl.textContent = "No POIs found in Firebase.";
        return;
    }

    entries.forEach(p => {
        const div = document.createElement("div");
        div.className = "poi-item";
        div.innerHTML = `
            <strong>${p.name}</strong> <span>(${p.affiliation})</span><br>
            [${p.lat}, ${p.lon}]
        `;
        listEl.appendChild(div);
    });
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
        const res = await fetch(`${baseUrl}pois.json`, {
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

loadPOIs();