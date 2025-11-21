import fs from "node:fs/promises";
import path from "node:path";

const DATA_PATH = path.join(process.cwd(), "scraper", "zizkov_pubs.json");
const OUT_PATH  = path.join(process.cwd(), "scraper", "pub_similarity.json");

async function loadPubs() {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return JSON.parse(raw);
}

// Simple haversine distance for similarity weighting
function distKm(a, b) {
    if (!a.lat || !a.lng || !b.lat || !b.lng) return null;
    const R = 6371;
    const toRad = x => (x * Math.PI) / 180;

    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);

    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const h = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/*
    Similarity score (0–1):

    score =
        + 0.5 * (geographical proximity)
        + 0.3 * (rating similarity)
        + 0.2 * (price similarity)

    Closer = higher score.
*/

function similarity(a, b) {
    const d = distKm(a, b);
    if (d == null) return 0;

    const proximity = Math.max(0, 1 - d / 1.0);  // linear drop within ~1km

    const ratingA = a.totalScore ?? 0;
    const ratingB = b.totalScore ?? 0;
    const ratingSim = 1 - Math.min(1, Math.abs(ratingA - ratingB) / 5);

    const pA = a.priceLevel ?? 2;
    const pB = b.priceLevel ?? 2;
    const priceSim = 1 - Math.min(1, Math.abs(pA - pB) / 4);

    return (
        0.5 * proximity +
        0.3 * ratingSim +
        0.2 * priceSim
    );
}

function buildSimilarityGraph(pubs, k = 5) {
    return pubs.map(p => {
        const edges = pubs
            .filter(q => q.id !== p.id)
            .map(q => ({
                id: q.id,
                title: q.title,
                score: similarity(p, q)
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, k);

        return {
            id: p.id,
            title: p.title,
            similar: edges
        };
    });
}

async function main() {
    const pubs = await loadPubs();
    const graph = buildSimilarityGraph(pubs, 5);

    await fs.writeFile(OUT_PATH, JSON.stringify(graph, null, 2), "utf8");
    console.log(`Generated pub_similarity.json`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { similarity, buildSimilarityGraph };

