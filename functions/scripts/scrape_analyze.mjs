import https from 'https';

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function analyze() {
  const pages = [
    'https://www.cadhatch.com/autocad-wood-hatch-patterns',
    'https://www.cadhatch.com/autocad-stone-hatch-patterns',
    'https://www.cadhatch.com/autocad-brickwork-hatch-patterns',
    'https://www.cadhatch.com/stones-gravel-hatch-patterns',
    'https://www.cadhatch.com/autocad-roof-tile-hatch-pattern',
    'https://www.cadhatch.com/tree-vegetation-hatch-patterns',
    'https://www.cadhatch.com/jointed-tiles-hatch-patterns'
  ];

  let totalZips = 0;
  let allZips = [];

  for (const url of pages) {
    console.log(`Analyzing: ${url}`);
    try {
      const html = await fetchPage(url);
      
      // Match all hrefs
      const regex = /href="([^"]+)"/g;
      let match;
      let zips = new Set();
      
      while ((match = regex.exec(html)) !== null) {
        if (match[1].includes('.zip')) {
          zips.add(match[1]);
        }
      }
      
      console.log(` -> Found ${zips.size} .zip links`);
      totalZips += zips.size;
      allZips.push(...zips);
    } catch (e) {
      console.error(`Error fetching ${url}: ${e.message}`);
    }
  }

  console.log(`\nTotal unique .zip files found: ${new Set(allZips).size}`);
}

analyze();
