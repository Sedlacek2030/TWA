let token = localStorage.getItem("token");

async function createPOI() {
    await fetch("http://127.0.0.1:8000/api/pois", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-token": token
        },
        body: JSON.stringify({
            name: document.getElementById("name").value,
            lat: parseFloat(document.getElementById("lat").value),
            lon: parseFloat(document.getElementById("lon").value),
            affiliation: document.getElementById("aff").value
        })
    });

    loadPOIs();
}

async function loadPOIs() {
    const res = await fetch("http://127.0.0.1:8000/api/pois", {
        headers: {"x-token": token}
    });

    const data = await res.json();

    document.getElementById("list").innerHTML =
        data.map(p => `<div>${p.name}</div>`).join("");
}