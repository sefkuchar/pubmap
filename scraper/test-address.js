const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
  const { data } = await axios.get('https://www.pivnidenicek.cz/restaurace-a-hospody/ceska-republika/praha/praha-3/zizkov/27752-ceel');
  const $ = cheerio.load(data);
  
  console.log('Looking for address in tables...');
  $('table tr').each((i, el) => {
    const label = $(el).find('td').eq(0).text().trim();
    const value = $(el).find('td').eq(1).text().trim();
    if (label) console.log('Label:', label, '| Value:', value);
  });
  
  console.log('\n\nLooking for any text with "Adresa"...');
  const pageText = $('body').text();
  const lines = pageText.split('\n').filter(l => l.includes('Adresa') || /\d{3}\s*\d{2}/.test(l));
  lines.slice(0, 10).forEach(l => console.log(l.trim()));
})();
