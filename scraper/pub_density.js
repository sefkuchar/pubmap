import fs from "node:fs/promises";
import path from "node:path";

const DATA_PATH = path.join(process.cwd(), "scraper", "zizkov_pubs.json");
const OUT_PATH  = path.join(process.cwd(), "scraper", "pub_density.json");

async function loadPubs() {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return JSON.parse(raw);
}

// Approximate conversion: ~111km per degree lat, ~70–80km per degree lon around Prague
const KM_PER_DEG_LAT = 110.574;
const KM_PER_DEG_LNG = 111.320 * Math.cos(50.0833 * Math.PI / 180);

// Grid size in km (200m × 200m cells)
const CELL_SIZE_KM = 0.2;

// Convert lat/lng to grid X/Y
function toGrid(lat, lng, originLat, originLng) {
    const dx = (lng - originLng) * KM_PER_DEG_LNG;
    const dy = (lat - originLat) * KM_PER_DEG_LAT;
    return {
        x: Math.floor(dx / CELL_SIZE_KM),
        y: Math.floor(dy / CELL_SIZE_KM)
    };
}

async function main() {
    const pubs = await loadPubs();

    // Filter only pubs with coords
    const withCoords = pubs.filter(p => p.lat && p.lng);
    if (withCoords.length === 0) {
        console.error("No pubs have coordinates. Cannot build density grid.");
        return;
    }

    // Choose first pub as grid origin
    const originLat = withCoords[0].lat;
    const originLng = withCoords[0].lng;

    const cells = new Map();

    withCoords.forEach(p => {
        const { x, y } = toGrid(p.lat, p.lng, originLat, originLng);
        const key = `${x},${y}`;
        cells.set(key, (cells.get(key) || 0) + 1);
    });

    // Convert to array
    const density = [];
    for (const [key, count] of cells.entries()) {
        const [x, y] = key.split(",").map(Number);
        density.push({ x, y, count });
    }

    await fs.writeFile(OUT_PATH, JSON.stringify(density, null, 2), "utf8");

    console.log(`Generated pub_density.json (${density.length} cells)`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { toGrid };

