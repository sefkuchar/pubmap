
const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://www.pivnidenicek.cz';
const LIST_URL = BASE_URL + '/restaurace-a-hospody/ceska-republika/praha/praha-3/zizkov';

async function getPubLinks() {
  console.log('Determining total number of pages...');
  const { data: firstPageHtml } = await axios.get(LIST_URL);
  const $first = cheerio.load(firstPageHtml);
  const pageNumbers = new Set();
  $first('a').each((i, el) => {
    const txt = $first(el).text().trim();
    const num = parseInt(txt, 10);
    if (!isNaN(num)) pageNumbers.add(num);
  });
  const maxPage = pageNumbers.size > 0 ? Math.max(...pageNumbers) : 1;
  console.log(`Detected ${maxPage} pages.`);
  const allLinks = new Set();
  for (let page = 1; page <= maxPage; page++) {
    const url = page === 1 ? LIST_URL : `${LIST_URL}/${page}`;
    console.log('Fetching pub list page:', url);
    const { data } = page === 1 ? { data: firstPageHtml } : await axios.get(url);
    const $ = cheerio.load(data);
    $('h3 a, h4 a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.startsWith('/restaurace-a-hospody/ceska-republika/praha/praha-3/zizkov/')) {
        allLinks.add(BASE_URL + href);
      }
    });
  }
  console.log(`Collected ${allLinks.size} unique pub links.`);
  return Array.from(allLinks);
}

async function geocodeAddress(address) {
  try {
    await new Promise(r => setTimeout(r, 1000)); // Rate limit: 1 req/sec
    const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: address, format: 'json', limit: 1 },
      headers: { 'User-Agent': 'PubMapScraper/1.0' }
    });
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (err) {
    console.error('Geocode failed for', address, err.message);
  }
  return null;
}

async function scrapePubDetail(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    // Extract address from page - it's in the first td that contains street and Praha
    let address = '';
    $('table tr').each((i, el) => {
      const firstTd = $(el).find('td').eq(0).text().trim();
      // Address pattern: street name/number, Praha
      if (firstTd && firstTd.includes('Praha') && /\d+\/\d+/.test(firstTd)) {
        address = firstTd.replace(/,\s*Praha.*/, '').trim();
        return false; // break
      }
    });
    return address;
  } catch (err) {
    console.error('Detail scrape failed for', url, err.message);
    return '';
  }
}

// Main function: get all pub links, scrape each
(async () => {
  console.log('Fetching Žižkov pub links...');
  const links = await getPubLinks();
  console.log(`Found ${links.length} pubs.`);
  // Parse list pages for beer info & price without visiting each detail page
  console.log('Extracting beer & price info from list pages...');
  const fs = require('fs');
  const resultsMap = {};
  // Re-fetch pages to extract block text
  const { data: firstPageHtml } = await axios.get(LIST_URL);
  const pageNumbers = Array.from({ length: 1 }); // placeholder to build below
  const $first = cheerio.load(firstPageHtml);
  const nums = new Set();
  $first('a').each((i, el) => {
    const t = $first(el).text().trim();
    const n = parseInt(t, 10);
    if (!isNaN(n)) nums.add(n);
  });
  const maxPage = nums.size ? Math.max(...nums) : 1;
  for (let page = 1; page <= maxPage; page++) {
    const listUrl = page === 1 ? LIST_URL : `${LIST_URL}/${page}`;
    const html = page === 1 ? firstPageHtml : (await axios.get(listUrl)).data;
    const $ = cheerio.load(html);
    $('h3').each((i, el) => {
      const anchor = $(el).find('a').first();
      const name = anchor.text().trim();
      const href = anchor.attr('href');
      if (!href) return;
      const fullUrl = BASE_URL + href;
      // Collect sibling text until next heading
      let sibling = $(el).next();
      const blockParts = [];
      while (sibling.length && sibling[0].tagName !== 'h3') {
        const txt = sibling.text().trim();
        if (txt) blockParts.push(txt.replace(/\s+/g, ' '));
        sibling = sibling.next();
      }
      const blockText = blockParts.join(' | ');
      const priceMatch = blockText.match(/(\d{1,3})\s*Kč/);
      // Heuristic: beers line contains '°' or commas and not 'Praha'
      const beersCandidate = blockParts.find(p => /°/.test(p) || (/[,]/.test(p) && !/Praha/.test(p)) ) || '';
      const entry = {
        name,
        url: fullUrl,
        beersRaw: beersCandidate,
        priceKc: priceMatch ? parseInt(priceMatch[1], 10) : null
      };
      resultsMap[fullUrl] = entry;
    });
  }
  let results = links.map(l => resultsMap[l] || { name: l.split('/').pop(), url: l, beersRaw: '', priceKc: null });
  
  // Geocode all addresses (with rate limiting)
  console.log('Geocoding pub addresses...');
  for (let i = 0; i < results.length; i++) {
    const pub = results[i];
    console.log(`Geocoding ${i+1}/${results.length}: ${pub.name}`);
    const address = await scrapePubDetail(pub.url);
    if (address) {
      const coords = await geocodeAddress(`${address}, Praha 3, Žižkov, Czech Republic`);
      if (coords) {
        pub.lat = coords.lat;
        pub.lng = coords.lng;
        pub.address = address;
      }
    }
  }
  
  fs.writeFileSync('zizkov_pubs.json', JSON.stringify(results, null, 2), 'utf-8');
  console.log('Scraping and geocoding complete. Data saved to zizkov_pubs.json');
})();
