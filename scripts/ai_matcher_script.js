const fs = require('fs');
const path = require('path');

const REVIT_CATALOG = path.join(__dirname, '../web/public/hatches/catalog.json');
const CADAUTH_CATALOG = path.join(__dirname, '../web/public/hatches-cadauth/catalog.json');
const AI_MATCHES_FILE = path.join(__dirname, 'ai_matches.json');

// --- Text Similarity Helpers ---
function tokenize(str) {
    if (!str) return [];
    return str.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 1);
}

function scoreMatch(patName, svgName) {
    const patTokens = tokenize(patName);
    const svgTokens = tokenize(svgName);
    
    let overlap = 0;
    for (const pt of patTokens) {
        if (svgTokens.includes(pt)) overlap += 2; // Exact word match is strong
        else {
            // Partial match (e.g., "hexagonal" vs "hexagon")
            for (const st of svgTokens) {
                if (st.includes(pt) || pt.includes(st)) {
                    if (st.length > 3 && pt.length > 3) overlap += 1;
                }
            }
        }
    }
    
    // Penalize if there are completely unrelated strong words (optional)
    return overlap;
}

function runAiMatch() {
    let revitData = [];
    let cadauthData = [];
    
    if (fs.existsSync(REVIT_CATALOG)) revitData = JSON.parse(fs.readFileSync(REVIT_CATALOG, 'utf-8'));
    if (fs.existsSync(CADAUTH_CATALOG)) cadauthData = JSON.parse(fs.readFileSync(CADAUTH_CATALOG, 'utf-8'));

    const svgs = cadauthData.filter(item => item.type === 'local_svg');
    const cadauthPats = cadauthData.filter(item => item.type === 'cadauthority');
    const revitPats = revitData;

    // Identify already validated matches from revitData
    const validatedMatches = {};
    for (const r of revitPats) {
        if (r.matched && r.img_url) {
            // Check if we can find the corresponding SVG object
            const svgMatch = svgs.find(s => r.img_url.includes(s.svg_file) || (s.pat_url === r.pat_url && s.pat_url));
            if (svgMatch) {
                validatedMatches[r.id] = svgMatch;
            } else {
                // Mock an SVG object for the HTML UI
                validatedMatches[r.id] = {
                    id: "local_validated_" + r.id,
                    name: "Validated Match",
                    img_url: r.img_url
                };
            }
        }
    }

    const aiMatches = {};
    const usedSvgs = new Set(Object.values(validatedMatches).map(s => s.id));

    // For unvalidated PATs, find the best SVG
    for (const pat of cadauthPats) {
        if (validatedMatches[pat.id]) continue;

        let bestScore = -1;
        let bestSvg = null;

        for (const svg of svgs) {
            // Optional: avoid duplicate SVG usage if the user wants 1-to-1
            // if (usedSvgs.has(svg.id)) continue; 
            
            const score = scoreMatch(pat.name, svg.name) + scoreMatch(pat.description, svg.name);
            
            if (score > bestScore && score > 0) { // Require at least some overlap
                bestScore = score;
                bestSvg = svg;
            }
        }

        if (bestSvg) {
            aiMatches[pat.id] = bestSvg;
            usedSvgs.add(bestSvg.id);
        }
    }

    console.log(`AI Matching complete. Found ${Object.keys(aiMatches).length} matches out of ${cadauthPats.length} PATs.`);
    
    // Combine both
    const finalMatches = { ...validatedMatches, ...aiMatches };
    fs.writeFileSync(AI_MATCHES_FILE, JSON.stringify(finalMatches, null, 2));
    console.log(`Saved matches to ${AI_MATCHES_FILE}`);
}

runAiMatch();
