# 🍺 Žižkov Pub Guide

Web aplikace pro průzkum žižkovských hospod s mapou, filtrováním a plánováním pub tour.

## Features

- 📊 **Tabulka hospod** - řazení podle ceny, názvu, počtu piv
- 🗺️ **Mapa** - interaktivní zobrazení všech hospod na Žižkově
- 🚶 **Pub Tour Planner** - generování optimální trasy mezi hospodami
- 🌓 **Světlý/Tmavý režim**
- 🔍 **Filtrování** - podle názvu, piva, max. ceny

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **TypeScript**
- **Leaflet** (mapa)
- **Axios + Cheerio** (scraper)
- **Nominatim API** (geokódování)

## Instalace

```bash
# Naklonuj repo
git clone https://github.com/<username>/pubmap.git
cd pubmap

# Nainstaluj závislosti
npm install

# Spusť dev server
npm run dev
```

Otevři [http://localhost:3000](http://localhost:3000)

## Scraping dat

Data se scrapují z pivnidenicek.cz:

```bash
cd scraper
node scrape.js
```

⚠️ **Geokódování trvá ~2 minuty** (94 hospod, Nominatim API limit 1 req/sec)

Výsledek se uloží do `scraper/zizkov_pubs.json`

## Struktura projektu

```
pubmap/
├── app/
│   ├── components/
│   │   ├── PubComparator.tsx    # Hlavní komponenta
│   │   ├── MapView.tsx          # Leaflet mapa
│   │   ├── PubTour.tsx          # Pub tour planner
│   │   └── PubComparatorClean.css
│   ├── api/pubs/route.ts        # API endpoint
│   └── page.tsx
├── scraper/
│   ├── scrape.js                # Web scraper
│   └── zizkov_pubs.json         # Data (94 hospod)
└── package.json
```

## Použití

### Základní funkce

1. **Tabulka** - zobraz seznam všech hospod s řazením
2. **Mapa** - přepni na mapové zobrazení
3. **Filtrování** - zadej název piva nebo max. cenu

### Pub Tour

1. Přepni na mapu
2. Zadej parametry tour:
   - Počet zastávok (1-10)
   - Max cena za pivo
   - Typ tour (Najbližšie/Najlacnejšie/Najviac pív)
3. Klikni "Vygeneruj Tour"
4. Na mapě se zobrazí červená trasa mezi hospodami

## License

MIT
