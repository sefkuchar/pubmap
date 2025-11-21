// scraper/normalize_apify.mjs
import fs from "node:fs/promises";
import path from "node:path";

const RAW_FILE = path.join(process.cwd(), "scraper", "zizkov_pubs_apify.json");
const OUT_FILE = path.join(process.cwd(), "scraper", "zizkov_pubs.json");

async function main() {
    const raw = JSON.parse(await fs.readFile(RAW_FILE, "utf8"));
    const meta = raw._apify || {};
    const items = raw.items || raw; // fallback if you export plain array

    const pubs = items.map((item, idx) => {
        const loc = item.location ?? {};
        return {
            id: item.placeId || `apify_${idx}`,
            name: item.title,
            category: item.categoryName ?? null,
            address: item.address ?? null,
            city: item.city ?? null,
            postalCode: item.postalCode ?? null,

            lat: loc.lat,
            lng: loc.lng,

            priceLevel: item.priceLevel ?? null,

            rating: item.totalScore ?? item.rating ?? null,
            userRatingsTotal: item.reviewsCount ?? null,
            website: item.website ?? null,
            phone: item.phone ?? null,

            _source: {
                apifyActor: meta.actorId ?? null,
                apifyInputFile: meta.inputFile ?? null
            }
        };
    });

    await fs.writeFile(OUT_FILE, JSON.stringify(pubs, null, 2), "utf8");
    console.log(`Normalized ${pubs.length} pubs → ${OUT_FILE}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
