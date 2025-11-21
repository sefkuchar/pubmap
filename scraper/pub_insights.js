// scraper/pub_insights.js

import fs from "node:fs/promises";
import path from "node:path";

const DATA_PATH = path.join(process.cwd(), "scraper", "zizkov_pubs.json");
const OUT_PATH  = path.join(process.cwd(), "scraper", "pub_insights.json");

async function loadPubs() {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return JSON.parse(raw);
}

function topRated(pubs, limit = 10) {
    return pubs
        .filter(p => p.totalScore != null)
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, limit);
}

function cheapest(pubs, limit = 10) {
    return pubs
        .filter(p => p.priceLevel != null)
        .sort((a, b) => a.priceLevel - b.priceLevel)
        .slice(0, limit);
}

function underrated(pubs, limit = 10) {
    return pubs
        .filter(p => p.priceLevel != null && p.totalScore != null)
        .map(p => ({
            ...p,
            score: p.totalScore - p.priceLevel  // quality – cost
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

function overrated(pubs, limit = 10) {
    return pubs
        .filter(p => p.priceLevel != null && p.totalScore != null)
        .map(p => ({
            ...p,
            score: p.priceLevel - p.totalScore // cost – quality
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

function ratingDistribution(pubs) {
    const hist = {};
    pubs.forEach(p => {
        if (p.totalScore == null) return;
        const r = Math.floor(p.totalScore);
        hist[r] = (hist[r] || 0) + 1;
    });
    return hist;
}

function priceDistribution(pubs) {
    const hist = {};
    pubs.forEach(p => {
        if (p.priceLevel == null) return;
        hist[p.priceLevel] = (hist[p.priceLevel] || 0) + 1;
    });
    return hist;
}

async function main() {
    const pubs = await loadPubs();

    const insights = {
        topRated:      topRated(pubs),
        cheapest:      cheapest(pubs),
        underrated:    underrated(pubs),
        overrated:     overrated(pubs),
        ratingHist:    ratingDistribution(pubs),
        priceHist:     priceDistribution(pubs)
    };

    await fs.writeFile(OUT_PATH, JSON.stringify(insights, null, 2), "utf8");

    console.log(`Generated pub_insights.json`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export {
    topRated,
    cheapest,
    underrated,
    overrated,
    ratingDistribution,
    priceDistribution
};

