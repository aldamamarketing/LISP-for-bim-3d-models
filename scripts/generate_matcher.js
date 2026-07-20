const fs = require('fs');
const path = require('path');

const REVIT_CATALOG = path.join(__dirname, '../web/public/hatches/catalog.json');
const CADAUTH_CATALOG = path.join(__dirname, '../web/public/hatches-cadauth/catalog.json');
const OUT_HTML = path.join(__dirname, '../matcher.html');

function generateHtml() {
    let revitData = [];
    let cadauthData = [];
    
    if (fs.existsSync(REVIT_CATALOG)) {
        revitData = JSON.parse(fs.readFileSync(REVIT_CATALOG, 'utf-8'));
    }
    if (fs.existsSync(CADAUTH_CATALOG)) {
        cadauthData = JSON.parse(fs.readFileSync(CADAUTH_CATALOG, 'utf-8'));
    }

    const svgs = cadauthData.filter(item => item.type === 'local_svg');
    const cadauthPats = cadauthData.filter(item => item.type === 'cadauthority');
    const revitPats = revitData;

    const allPats = [
        ...revitPats.map(p => ({...p, source: 'Revit'})),
        ...cadauthPats.map(p => ({...p, source: 'CadAuthority'}))
    ];

    // Read PAT file contents for those without images
    allPats.forEach(pat => {
        if (!pat.img_url && pat.pat_url) {
            try {
                const patPath = path.join(__dirname, '../web/public', pat.pat_url);
                if (fs.existsSync(patPath)) {
                    pat.patCode = fs.readFileSync(patPath, 'utf8');
                }
            } catch (e) {
                console.error("Error al leer", pat.pat_url);
            }
        }
    });

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Matcher de Patrones</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .selected { border-color: #3b82f6; background-color: #eff6ff; }
        .matched { border-left: 4px solid #10b981; }
    </style>
</head>
<body class="bg-gray-100 h-screen flex flex-col overflow-hidden">
    <header class="bg-slate-800 text-white p-4 flex justify-between items-center shadow-md z-10">
        <h1 class="text-xl font-bold">Herramienta de Emparejamiento: PATs vs SVGs</h1>
        <div>
            <span id="statsCounter" class="mr-4 text-sm font-semibold bg-slate-700 px-3 py-1 rounded">0 / ${allPats.length} emparejados</span>
            <button onclick="exportJson()" class="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded shadow">
                Exportar JSON de Emparejamiento
            </button>
        </div>
    </header>

    <div class="flex flex-1 overflow-hidden">
        
        <!-- COL IZQ: PATs -->
        <div class="w-1/4 bg-white border-r overflow-y-auto flex flex-col">
            <div class="p-3 bg-gray-50 border-b font-bold text-gray-700 sticky top-0 shadow-sm z-10">Archivos a Emparejar (${allPats.length})</div>
            <div id="patList" class="flex-1 overflow-y-auto p-2 space-y-2"></div>
        </div>

        <!-- COL CENTRO: ACTIVO Y SUGERENCIAS -->
        <div class="w-2/4 bg-gray-50 p-6 flex flex-col overflow-y-auto">
            <div id="activeArea" class="hidden flex-col gap-6">
                <!-- Tarjeta Activa -->
                <div class="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <div class="flex justify-between items-start mb-4">
                        <h2 id="activeName" class="text-2xl font-bold text-gray-800"></h2>
                        <span id="activeSource" class="text-xs font-bold uppercase tracking-wider py-1 px-2 rounded bg-indigo-100 text-indigo-800"></span>
                    </div>
                    <p id="activeDesc" class="text-gray-600 mb-4 h-20 overflow-y-auto"></p>
                    <div class="flex justify-center items-center bg-gray-100 rounded p-4 mb-4" style="min-height:200px;">
                        <div id="activeImg" class="w-full h-48 hidden" style="background-size: 50% 50%; background-repeat: repeat; background-position: center;"></div>
                        <div id="activeSvgContainer" class="w-full h-48 flex justify-center overflow-hidden rounded-lg hidden"></div>
                    </div>
                    
                    <div id="currentMatchBox" class="hidden p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="bg-emerald-500 text-white p-2 rounded-full">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                            <div>
                                <p class="text-xs text-emerald-600 font-bold uppercase">Emparejado con:</p>
                                <p id="currentMatchName" class="font-semibold text-gray-800"></p>
                            </div>
                        </div>
                        <img id="currentMatchImg" class="w-10 h-10 object-contain" src="" />
                        <button onclick="clearMatch()" class="text-red-500 hover:text-red-700 text-sm font-bold">Desvincular</button>
                    </div>
                </div>

                <!-- Sugerencias -->
                <div>
                    <h3 class="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        Sugerencias Inteligentes
                    </h3>
                    <div id="suggestionsBox" class="grid grid-cols-3 gap-4"></div>
                </div>
            </div>
            
            <div id="emptyState" class="flex-1 flex items-center justify-center text-gray-400">
                <p class="text-lg">Selecciona un patrón de la izquierda para comenzar.</p>
            </div>
        </div>

        <!-- COL DER: SVGs LOCALES -->
        <div class="w-1/4 bg-white border-l overflow-y-auto flex flex-col">
            <div class="p-3 bg-gray-50 border-b sticky top-0 shadow-sm z-10">
                <input type="text" id="svgSearch" placeholder="Buscar SVG por nombre..." class="w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" onkeyup="filterSvgs()">
            </div>
            <div id="svgList" class="flex-1 overflow-y-auto p-2 grid grid-cols-2 gap-2"></div>
        </div>
    </div>

    <script>
        const PAtData = ${JSON.stringify(allPats)};
        const SVGData = ${JSON.stringify(svgs)};
        const basePath = 'web/public';
        
        let activePat = null;
        let matches = (function() {
            try {
                // Try to inject server-side ai_matches.json if available
                const fs = require('fs');
                const p = require('path').join(__dirname, 'ai_matches.json');
                if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
            } catch(e) {}
            return {};
        })();
        // Server will just replace this statically during generation
        matches = ${fs.existsSync(path.join(__dirname, 'ai_matches.json')) ? fs.readFileSync(path.join(__dirname, 'ai_matches.json'), 'utf-8') : '{}'};


        function init() {
            renderPatList();
            renderSvgList(SVGData);
            updateStats();
        }

        // ---------- PAT TO SVG PREVIEW LOGIC ----------
        function parsePatLine(line) {
            const parts = line.split(',').map(s => parseFloat(s.trim()));
            if (parts.length < 5) return null;
            return {
                ang: parts[0],
                ox: parts[1],
                oy: parts[2],
                dx: parts[3],
                dy: parts[4],
                dashes: parts.slice(5).filter(n => !isNaN(n))
            };
        }

        function generateSvgPathsFromPat(patCode) {
            const lines = patCode.split('\\n')
                .map(l => l.trim())
                .filter(l => l && !l.startsWith('*') && !l.startsWith(';'));

            const defs = lines.map(parsePatLine).filter(d => d !== null);
            if (defs.length === 0) return null;

            let maxStep = 1;
            for (const def of defs) {
                if (Math.abs(def.dx) > maxStep) maxStep = Math.abs(def.dx);
                if (Math.abs(def.dy) > maxStep) maxStep = Math.abs(def.dy);
            }

            let minX = 0, minY = 0, maxX = maxStep, maxY = maxStep;
            for (const def of defs) {
                if (def.ox < minX) minX = def.ox;
                if (def.ox > maxX) maxX = def.ox;
                if (def.oy < minY) minY = def.oy;
                if (def.oy > maxY) maxY = def.oy;
            }

            const w = Math.max(maxX - minX + maxStep * 2, maxStep * 4, 10);
            const h = Math.max(maxY - minY + maxStep * 2, maxStep * 4, 10);
            const viewportSize = Math.max(w, h);

            let svgLines = '';
            let lineCount = 0;
            const MAX_LINES = 1000; 

            const strokeW = Math.max(viewportSize / 300, 0.5);

            for (const def of defs) {
                if (lineCount >= MAX_LINES) break;

                const rad = def.ang * Math.PI / 180;
                const cosA = Math.cos(rad);
                const sinA = Math.sin(rad);

                let dashStr = '';
                if (def.dashes.length > 0) {
                    const validDashes = def.dashes.map(v => Math.max(0.0001, Math.abs(v)));
                    dashStr = ' stroke-dasharray="' + validDashes.join(',') + '"';
                }

                const perpX = -sinA * def.dy;
                const perpY =  cosA * def.dy;
                const shiftX = cosA * def.dx;
                const shiftY = sinA * def.dx;

                let stepSize = Math.max(Math.abs(def.dy), Math.abs(def.dx), 0.1);
                let reps = Math.ceil((viewportSize * 2) / stepSize);
                reps = Math.min(reps, 50); 

                for (let i = -reps; i <= reps; i++) {
                    if (lineCount >= MAX_LINES) break;

                    const cx = def.ox + (i * perpX) + (i * shiftX);
                    const cy = def.oy + (i * perpY) + (i * shiftY);

                    const len = viewportSize * 2;
                    const x1 = Math.round((cx - len * cosA) * 100) / 100;
                    const y1 = Math.round((cy - len * sinA) * 100) / 100;
                    const x2 = Math.round((cx + len * cosA) * 100) / 100;
                    const y2 = Math.round((cy + len * sinA) * 100) / 100;

                    if (
                        (x1 > minX + w && x2 > minX + w) || (x1 < minX && x2 < minX) ||
                        (y1 > minY + h && y2 > minY + h) || (y1 < minY && y2 < minY)
                    ) {
                        continue;
                    }

                    svgLines += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke-dashoffset="' + (-len) + '"' + dashStr + ' />\\n';
                    lineCount++;
                }
            }

            return {
                svgLines,
                viewBox: minX + ' ' + minY + ' ' + w + ' ' + h,
                strokeWidth: strokeW
            };
        }
        // ----------------------------------------------

        function calculateSimilarity(str1, str2) {
            str1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
            str2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (str1.includes(str2) || str2.includes(str1)) return 50;
            let matches = 0;
            for(let i=0; i<str1.length; i++) {
                if (str2.includes(str1[i])) matches++;
            }
            return matches;
        }

        function renderPatList() {
            const container = document.getElementById('patList');
            container.innerHTML = '';
            PAtData.forEach(pat => {
                const el = document.createElement('div');
                const isMatched = matches[pat.id];
                const activeId = activePat ? activePat.id : '';
                el.className = 'p-3 border rounded cursor-pointer hover:bg-gray-50 transition ' + (activeId === pat.id ? 'selected ' : '') + (isMatched ? 'matched' : '');
                
                let matchText = '';
                if(isMatched) {
                    matchText = '<div class="text-xs text-emerald-600 mt-1 font-semibold">✓ ' + isMatched.name + '</div>';
                }
                
                el.innerHTML = '<div class="text-xs text-gray-400 mb-1">' + pat.source + '</div><div class="font-semibold text-gray-800 truncate" title="' + pat.name + '">' + pat.name + '</div>' + matchText;
                el.onclick = () => selectPat(pat);
                container.appendChild(el);
            });
        }

        function filterSvgs() {
            const term = document.getElementById('svgSearch').value.toLowerCase();
            const filtered = SVGData.filter(svg => svg.name.toLowerCase().includes(term) || svg.id.toLowerCase().includes(term));
            renderSvgList(filtered);
        }

        function renderSvgList(list) {
            const container = document.getElementById('svgList');
            container.innerHTML = '';
            list.forEach(svg => {
                const el = document.createElement('div');
                el.className = 'border rounded p-2 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:shadow text-center';
                const imgSrc = basePath + svg.img_url;
                el.innerHTML = '<img src="' + imgSrc + '" class="w-12 h-12 object-contain mb-2 opacity-80" onerror="this.remove()" /><span class="text-xs font-semibold text-gray-700 w-full truncate" title="' + svg.name + '">' + svg.name + '</span>';
                el.onclick = () => matchSvgToActive(svg);
                container.appendChild(el);
            });
        }

        function selectPat(pat) {
            activePat = pat;
            document.getElementById('emptyState').classList.add('hidden');
            document.getElementById('activeArea').classList.remove('hidden');
            
            document.getElementById('activeName').innerText = pat.name;
            document.getElementById('activeSource').innerText = pat.source;
            document.getElementById('activeDesc').innerHTML = pat.description || '<em class="text-gray-400">Sin descripción</em>';
            
            const imgEl = document.getElementById('activeImg');
            const svgContainer = document.getElementById('activeSvgContainer');
            
            if (pat.img_url) {
                // Use a div with background-image to tile 2x2 (50% size)
                imgEl.style.backgroundImage = "url('" + basePath + pat.img_url + "')";
                imgEl.classList.remove('hidden');
                svgContainer.innerHTML = '';
                svgContainer.classList.add('hidden');
            } else if (pat.patCode) {
                imgEl.style.backgroundImage = 'none';
                imgEl.classList.add('hidden');
                
                const svgData = generateSvgPathsFromPat(pat.patCode);
                if (svgData) {
                    svgContainer.innerHTML = '<svg width="100%" height="100%" viewBox="' + svgData.viewBox + '" xmlns="http://www.w3.org/2000/svg" style="background:#000; border-radius:8px;"><g stroke="#fff" stroke-width="0.01" vector-effect="non-scaling-stroke" stroke-linecap="square" fill="none">' + svgData.svgLines + '</g></svg>';
                    svgContainer.classList.remove('hidden');
                } else {
                    svgContainer.innerHTML = '<p class="text-gray-400">No se pudo generar la previsualización del PAT.</p>';
                    svgContainer.classList.remove('hidden');
                }
            } else {
                imgEl.style.backgroundImage = 'none';
                imgEl.classList.add('hidden');
                svgContainer.innerHTML = '<p class="text-gray-400">No hay imagen ni código disponible.</p>';
                svgContainer.classList.remove('hidden');
            }
            
            renderSuggestions(pat);
            updateMatchUI();
            renderPatList();
        }

        function renderSuggestions(pat) {
            const container = document.getElementById('suggestionsBox');
            container.innerHTML = '';
            
            const scored = SVGData.map(svg => {
                let score = calculateSimilarity(pat.name, svg.name);
                const patWords = pat.name.toLowerCase().split(' ');
                const svgWords = svg.name.toLowerCase().split(' ');
                let exactMatches = patWords.filter(w => svgWords.includes(w)).length;
                score += exactMatches * 100;
                return { svg, score };
            });
            
            scored.sort((a,b) => b.score - a.score);
            const best = scored.slice(0, 3).map(s => s.svg);
            
            best.forEach(svg => {
                const el = document.createElement('div');
                el.className = 'bg-white border rounded p-3 flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 hover:shadow text-center transition';
                const imgSrc = basePath + svg.img_url;
                el.innerHTML = '<img src="' + imgSrc + '" class="w-12 h-12 object-contain mb-2" onerror="this.remove()" /><span class="text-xs font-bold text-gray-700 truncate w-full" title="' + svg.name + '">' + svg.name + '</span><span class="text-[10px] text-gray-400 mt-1 uppercase">Sugerencia</span>';
                el.onclick = () => matchSvgToActive(svg);
                container.appendChild(el);
            });
        }

        function matchSvgToActive(svg) {
            if (!activePat) return;
            matches[activePat.id] = svg;
            updateMatchUI();
            renderPatList();
            updateStats();
        }

        function clearMatch() {
            if (!activePat) return;
            delete matches[activePat.id];
            updateMatchUI();
            renderPatList();
            updateStats();
        }

        function updateMatchUI() {
            if (!activePat) return;
            const matchBox = document.getElementById('currentMatchBox');
            if (matches[activePat.id]) {
                const svg = matches[activePat.id];
                matchBox.classList.remove('hidden');
                document.getElementById('currentMatchName').innerText = svg.name;
                document.getElementById('currentMatchImg').src = basePath + svg.img_url;
            } else {
                matchBox.classList.add('hidden');
            }
        }

        function updateStats() {
            const count = Object.keys(matches).length;
            document.getElementById('statsCounter').innerText = count + " / " + PAtData.length + " emparejados";
        }

        function exportJson() {
            if (Object.keys(matches).length === 0) {
                alert("No has emparejado ningún patrón todavía.");
                return;
            }
            
            const finalData = PAtData.map(pat => {
                const patCopy = Object.assign({}, pat);
                delete patCopy.patCode; // Remove raw code before exporting
                
                const matchedSvg = matches[pat.id];
                if (matchedSvg) {
                    return Object.assign(patCopy, {
                        img_url: matchedSvg.img_url,
                        svg_file: matchedSvg.svg_file,
                        matched: true
                    });
                }
                return patCopy;
            });
            
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(finalData, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "matched_catalog.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        }

        window.onload = init;
    </script>
</body>
</html>
    `;

    fs.writeFileSync(OUT_HTML, htmlContent);
    console.log('✅ matcher.html generado exitosamente en el root del proyecto.');
}

generateHtml();
