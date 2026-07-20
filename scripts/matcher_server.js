const express = require('express');
const fs = require('fs');
const path = require('path');
const { getVisualMetadata } = require('./svg_metadata_map');

const app = express();
app.use(express.json({ limit: '50mb' }));

// Serve static files (SVGs, PATs, etc.) from web/public
app.use('/public', express.static(path.join(__dirname, '../web/public')));

// Directories and Files
const REVIT_CATALOG = path.join(__dirname, '../web/public/hatches/catalog.json');
const CADAUTH_CATALOG = path.join(__dirname, '../web/public/hatches-cadauth/catalog.json');
const GENERATED_SVG_DIR = path.join(__dirname, '../web/public/hatches/generated');
const VIEWER_HTML = path.join(__dirname, 'views/matcher.html');

// Ensure generated directory exists
if (!fs.existsSync(GENERATED_SVG_DIR)) {
    fs.mkdirSync(GENERATED_SVG_DIR, { recursive: true });
}

// GET /api/data
app.get('/api/data', (req, res) => {
    let revitData = [];
    let cadauthData = [];
    
    if (fs.existsSync(REVIT_CATALOG)) {
        revitData = JSON.parse(fs.readFileSync(REVIT_CATALOG, 'utf-8'));
    }
    if (fs.existsSync(CADAUTH_CATALOG)) {
        cadauthData = JSON.parse(fs.readFileSync(CADAUTH_CATALOG, 'utf-8'));
    }

    let svgs = [];
    
    const scanSvgs = (dirPath, webPath) => {
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.svg'));
            files.forEach(f => {
                const id = f.replace('.svg', '');
                if (!svgs.some(s => s.id === id)) {
                    const metadata = getVisualMetadata(f);
                    svgs.push({
                        id: id,
                        name: metadata.name || f.replace(/_/g, ' '),
                        img_url: `${webPath}/${f}`,
                        description: metadata.description,
                        categories: metadata.categories,
                        type: 'local_svg'
                    });
                }
            });
        }
    };
    
    scanSvgs(path.join(__dirname, '../web/public/hatches-cadauth/assets'), '/hatches-cadauth/assets');
    scanSvgs(path.join(__dirname, '../web/public/patterns'), '/patterns');
    scanSvgs(path.join(__dirname, '../web/public/hatches/assets'), '/hatches/assets');
    scanSvgs(path.join(__dirname, '../web/public/hatches-cadauth/generated'), '/hatches-cadauth/generated');
    scanSvgs(path.join(__dirname, '../web/public/hatches/generated'), '/hatches/generated');
    
    cadauthData.filter(item => item.type === 'local_svg').forEach(item => {
        if (!svgs.some(s => s.id === item.id)) svgs.push(item);
    });
    const cadauthPats = cadauthData.filter(item => item.type === 'cadauthority');

    const allPats = [
        ...revitData.map(p => ({...p, source: 'Revit'})),
        ...cadauthPats.map(p => ({...p, source: 'CadAuthority'}))
    ];

    const validPats = [];
    allPats.forEach(pat => {
        if (pat.pat_url) {
            try {
                const patPath = path.join(__dirname, '../web/public', pat.pat_url);
                if (fs.existsSync(patPath)) {
                    pat.patCode = fs.readFileSync(patPath, 'utf8');
                    validPats.push(pat);
                }
            } catch (e) {
                console.error("Error al leer", pat.pat_url);
            }
        }
    });

    res.json({ pats: validPats, svgs: svgs });
});

// POST /api/save-svg
app.post('/api/save-svg', (req, res) => {
    const { patId, svgContent, manualImgUrl, name, description, categories, source } = req.body;
    
    if (!patId || (!svgContent && !manualImgUrl)) {
        return res.status(400).json({ error: "Faltan datos requeridos" });
    }

    try {
        let savedImgUrl = manualImgUrl;

        if (svgContent) {
            let safeName = patId.replace(/\.pat$/i, '').replace(/[^a-z0-9_-]/gi, '_');
            const svgFilename = `${safeName}.svg`;
            
            let svgDir = '';
            let relativeUrlPath = '';
            if (source && source.toUpperCase() === 'REVIT') {
                svgDir = path.join(__dirname, '../web/public/hatches/generated');
                relativeUrlPath = `/hatches/generated/${svgFilename}`;
            } else {
                svgDir = path.join(__dirname, '../web/public/hatches-cadauth/generated');
                relativeUrlPath = `/hatches-cadauth/generated/${svgFilename}`;
            }
            
            if (!fs.existsSync(svgDir)) {
                fs.mkdirSync(svgDir, { recursive: true });
            }

            const svgFilePath = path.join(svgDir, svgFilename);
            fs.writeFileSync(svgFilePath, svgContent, 'utf8');
            savedImgUrl = relativeUrlPath;
        }

        let updated = false;
        
        const updateCatalog = (catalogPath) => {
            if (!fs.existsSync(catalogPath)) return false;
            const data = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
            const idx = data.findIndex(p => p.id === patId);
            if (idx !== -1) {
                data[idx].name = name || data[idx].name;
                data[idx].description = description || data[idx].description;
                if (categories) {
                    data[idx].categories = categories.split(',').map(s => s.trim()).filter(s => s.length > 0);
                }
                data[idx].img_url = savedImgUrl;
                data[idx].matched = true;
                fs.writeFileSync(catalogPath, JSON.stringify(data, null, 2), 'utf-8');
                return true;
            }
            return false;
        };

        if (updateCatalog(REVIT_CATALOG)) updated = true;
        else if (updateCatalog(CADAUTH_CATALOG)) updated = true;

        if (updated) {
            res.json({ success: true, message: "SVG guardado exitosamente.", img_url: savedImgUrl });
        } else {
            res.status(404).json({ error: "PAT no encontrado en los catálogos." });
        }
        
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Error interno", details: e.message });
    }
});

const VIEWER_GRID_HTML = path.join(__dirname, 'views/svg_viewer.html');
const VIEWER_JPG_HTML = path.join(__dirname, 'views/jpg_viewer.html');
const VALIDATOR_HTML = path.join(__dirname, 'views/validator.html');

// Serve the frontend UI
app.get('/', (req, res) => {
    if (fs.existsSync(VIEWER_HTML)) {
        res.sendFile(VIEWER_HTML);
    } else {
        res.status(404).send("No se encuentra views/matcher.html. Crea este archivo.");
    }
});

app.get('/viewer', (req, res) => {
    if (fs.existsSync(VIEWER_GRID_HTML)) {
        res.sendFile(VIEWER_GRID_HTML);
    } else {
        res.status(404).send("No se encuentra views/svg_viewer.html.");
    }
});

app.get('/jpg', (req, res) => {
    if (fs.existsSync(VIEWER_JPG_HTML)) {
        res.sendFile(VIEWER_JPG_HTML);
    } else {
        res.status(404).send("No se encuentra views/jpg_viewer.html.");
    }
});

app.get('/validator', (req, res) => {
    if (fs.existsSync(VALIDATOR_HTML)) {
        res.sendFile(VALIDATOR_HTML);
    } else {
        res.status(404).send("No se encuentra views/validator.html.");
    }
});

app.get('/api/matches', (req, res) => {
    const matchesPath = path.join(__dirname, 'visual_matches.json');
    if (fs.existsSync(matchesPath)) {
        res.sendFile(matchesPath);
    } else {
        res.json({});
    }
});

app.post('/api/validate-match', (req, res) => {
    const { patId, svgId } = req.body;
    let found = false;
    
    // Buscar en Revit
    let revitData = JSON.parse(fs.readFileSync(path.join(__dirname, '../web/public/hatches/catalog.json'), 'utf8'));
    let item = revitData.find(i => i.id === patId);
    if (item) {
        item.matched = true;
        item.img_url = '/patterns/' + svgId; // Enlaza el SVG
        fs.writeFileSync(path.join(__dirname, '../web/public/hatches/catalog.json'), JSON.stringify(revitData, null, 2));
        found = true;
    } else {
        // Buscar en CADAuth
        let cadauthData = JSON.parse(fs.readFileSync(path.join(__dirname, '../web/public/hatches-cadauth/catalog.json'), 'utf8'));
        item = cadauthData.find(i => i.id === patId);
        if (item) {
            item.matched = true;
            item.img_url = '/patterns/' + svgId;
            fs.writeFileSync(path.join(__dirname, '../web/public/hatches-cadauth/catalog.json'), JSON.stringify(cadauthData, null, 2));
            found = true;
        }
    }
    
    if (found) {
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, error: "PAT not found" });
    }
});

const PORT = 3005;
app.listen(PORT, () => {
    console.log(`✅ Servidor Matcher iniciado en http://localhost:${PORT}`);
    console.log(`👉 Abre tu navegador en: http://localhost:${PORT}`);
});
