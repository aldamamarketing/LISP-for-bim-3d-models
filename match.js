const fs = require('fs');
const path = require('path');

const catalogPath = 'Z:\\Autocad Config\\LISP\\web\\public\\api\\hatch-catalog.json';
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const svgsDir = 'Z:\\Autocad Config\\LISP\\web\\public\\patterns';
const svgs = fs.readdirSync(svgsDir).filter(f => f.endsWith('.svg'));

// simple similarity: Jaccard index on bigrams + word overlap
function getSimilarity(s1, s2) {
    s1 = s1.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    s2 = s2.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    const words1 = new Set(s1.split(/\s+/).filter(w=>w));
    const words2 = new Set(s2.split(/\s+/).filter(w=>w));
    let intersection = 0;
    for(let w of words1) if(words2.has(w)) intersection++;
    return intersection / (words1.size + words2.size - intersection);
}

let exactMatches = 0;
let suggested = [];

catalog.forEach(item => {
    let bestMatch = null;
    let bestScore = -1;
    svgs.forEach(svg => {
        let score = getSimilarity(item.name, svg);
        // Bonus if codeName matches part of SVG
        if (svg.replace('.svg','').toLowerCase().includes(item.codeName.toLowerCase())) score += 0.5;
        if (score > bestScore) {
            bestScore = score;
            bestMatch = svg;
        }
    });
    
    suggested.push({
        id: item.id,
        name: item.name,
        code: item.codeName,
        suggestedSvg: bestMatch,
        score: bestScore
    });
    if (bestScore > 0.5) exactMatches++;
});

console.log('Total catalog items: ' + catalog.length);
console.log('Matches > 0.5 score: ' + exactMatches);
console.log('Sample suggestions:');
console.table(suggested.slice(0, 15).map(s => ({ Name: s.name, Code: s.code, SVG: s.suggestedSvg, Score: s.score.toFixed(2) })));
