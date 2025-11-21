// scraper/pub_utils.js

import fs from "node:fs/promises";
import path from "node:path";

// ----------------------------
// Load dataset
// ----------------------------

const DATA_PATH = path.join(process.cwd(), "scraper", "1zizkov_pubs.json");

async function loadPubs() {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return JSON.parse(raw);
}

// ----------------------------
// Distance (Haversine)
// ----------------------------

function distanceKm(a, b) {
    if (!a.lat || !a.lng || !b.lat || !b.lng) return null;


    const R = 6371;
    const toRad = x => (x * Math.PI) / 180;

    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);

    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// ----------------------------
// Compute nearest neighbors
// ----------------------------

function computeNearest(pubs, k = 5) {
    return pubs.map(p => {
        const neighbors = pubs
            .filter(q => q.id !== p.id)
            .map(q => {
                const d = distanceKm(p, q);
                return d == null ? null : { id: q.id, title: q.title, distanceKm: d };
            })
            .filter(Boolean)
            .sort((a, b) => a.distanceKm - b.distanceKm)
            .slice(0, 5);

        return {
            id: p.id,
            title: p.title,
            nearest: neighbors
        };
    });
}

// ----------------------------
// Example CLI execution
// ----------------------------

async function main() {
    const pubs = await loadPubs();
    const nearestList = computeNearest(pubs, 5);

    const OUT = path.join(process.cwd(), "scraper", "nearest_neighbors.json");
    await fs.writeFile(OUT, JSON.stringify(nearestList, null, 2), "utf8");

    console.log(`Generated nearest_neighbors.json with ${nearestList.length} entries`);
}

// Run only if invoked directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

// ----------------------------
// Exports (usable by frontend dev)
// ----------------------------

export { loadPubs, distanceKm, computeNearest };

