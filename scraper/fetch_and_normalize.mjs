import fs from "node:fs/promises";
import path from "node:path";


const ACTOR_ID = "compass~crawler-google-places";
const OUTPUT = path.join(process.cwd(), "scraper", "zizkov_pubs.json");
const INPUT = {
    searchStringsArray: [
        "pub Žižkov",
        "bar Žižkov",
        "beer Žižkov",
        "hospoda Žižkov",
        "pivnice Žižkov",
        "restaurant Žižkov"
    ],

    locationQuery: "Žižkov, Prague, Czechia",
    maxCrawledPlacesPerSearch: 80,
    language: "cs",

    // THE IMPORTANT LINE — FILTER BY GOOGLE'S PLACE TYPES
    includePlaceTypes: [
        "bar",
        "pub",
        "night_club",
        "brewery"
    ],

    // Remove everything else
    excludePlaceTypes: [
        "pharmacy",
        "drugstore",
        "supermarket",
        "gym",
        "cafe",
        "bistro",
        "parking",
        "lodging",
        "library",
        "bank",
        "atm",
        "doctor",
        "dentist",
        "school",
        "car_repair",
        "car_wash",
        "store"
    ]
};

// =========================
// SAFETY
// =========================

const TOKEN = process.env.APIFY_TOKEN;
if (!TOKEN) {
    console.error("Missing APIFY_TOKEN");
    process.exit(1);
}

// =========================
// FETCH RAW DATA FROM APIFY
// =========================

async function fetchApify() {
    const url =
        `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items` +
        `?token=${TOKEN}&format=json&clean=1`;

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(INPUT)
    });

    if (!res.ok) {
        console.error("Apify returned HTTP error:", res.status);
        console.error(await res.text());
        process.exit(1);
    }

    return await res.json(); // returns array
}

// =========================
// NORMALIZATION HELPERS
// =========================

function extractLat(item) {
    return (
        item.location?.lat ??
        item.locationLat ??
        item.latitude ??
        item.gpsLat ??
        item.coords?.lat ??
        null
    );
}

function extractLng(item) {
    return (
        item.location?.lng ??
        item.locationLng ??
        item.longitude ??
        item.gpsLng ??
        item.coords?.lng ??
        null
    );
}

function extractPriceLevel(item) {
    // Apify actors sometimes use priceLevel or price or priceRange
    if (typeof item.priceLevel === "number") return item.priceLevel;
    if (typeof item.price === "number") return item.price;

    // Sometimes they give "$" / "$$" etc.
    if (typeof item.price === "string") {
        const dollarCount = item.price.replace(/[^$]/g, "").length;
        return dollarCount === 0 ? null : dollarCount; // "$$" -> 2
    }

    return null;
}

function extractName(item) {
    return item.title ?? item.name ?? item.displayName ?? null;
}

function extractCategory(item) {
    return item.categoryName ?? item.type ?? item.category ?? null;
}

// =========================
// MAIN NORMALIZER
// =========================

async function main() {
    console.log("Fetching Apify data…");
    const items = await fetchApify();

    console.log(`Received ${items.length} raw items.`);

    const pubs = items.map((item, idx) => {
        const lat = extractLat(item);
        const lng = extractLng(item);

        return {
            id: item.placeId || `apify_${idx}`,
            title: extractName(item),
            totalScore: item.totalScore ?? item.rating ?? null,
            reviewsCount: item.reviewsCount ?? item.userRatingsTotal ?? null,
            street: item.street ?? item.address ?? null,
            city: item.city ?? item.locality ?? null,
            state: item.state ?? null,
            countryCode: item.countryCode ?? null,
            website: item.website ?? null,
            phone: item.phone ?? null,
            categoryName: extractCategory(item),
            url: item.url ?? null,
            lat,
            lng,
            priceLevel: extractPriceLevel(item)
        };
    });

    await fs.writeFile(OUTPUT, JSON.stringify(pubs, null, 2), "utf8");
    console.log(`Wrote normalized pubs to ${OUTPUT}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

