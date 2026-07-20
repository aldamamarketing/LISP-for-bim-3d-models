const fs = require('fs');
const path = require('path');
const https = require('https');

const SCRAPE_URL = 'https://cadauthority.com/free-autocad-hatch-patterns-download/';
const OUT_DIR = path.join(__dirname, '../web/public/hatches-cadauth');
const ASSETS_DIR = path.join(OUT_DIR, 'assets');
const LOCAL_SVG_DIR = path.join(__dirname, '../web/public/patterns');
const CATALOG_PATH = path.join(OUT_DIR, 'catalog.json');

// Helper to make human readable names
function cleanName(filename) {
    let name = filename.replace(/\.(pat|svg)$/i, '');
    // replace underscores and hyphens with spaces
    name = name.replace(/[_-]/g, ' ');
    // Title Case (capitalize first letter of each word)
    name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return name;
}

// Download file helper
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

// Ensure dirs exist
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

async function main() {
    console.log('Fetching CadAuthority...');
    
    // 1. Fetch HTML
    const html = await new Promise((resolve, reject) => {
        https.get(SCRAPE_URL, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });

    const catalog = [];
    
    // 2. Parse PATs and descriptions from <li> elements
    const liRegex = /<li><a href="([^"]+\.pat)"[^>]*>(?:<strong>)?(.*?\/?)(?:<\/strong>)?<\/a>\s*(.*?)<\/li>/g;
    let match;
    const downloadPromises = [];
    
    console.log('Found patterns on CadAuthority:');
    while ((match = liRegex.exec(html)) !== null) {
        const url = match[1];
        const filename = path.basename(url);
        const description = match[3].replace(/<[^>]*>?/gm, '').trim(); // Remove any inner HTML from description
        
        const humanName = cleanName(filename);
        console.log(` - ${humanName}`);
        
        catalog.push({
            id: filename.replace('.pat', ''),
            name: humanName,
            description: description,
            type: 'cadauthority',
            pat_file: filename,
            pat_url: `/hatches-cadauth/assets/${filename}`,
            img_url: null, // No image yet
            svg_file: null
        });
        
        // Schedule download
        const destPath = path.join(ASSETS_DIR, filename);
        downloadPromises.push(downloadFile(url, destPath));
    }
    
    // 3. Process Local SVGs
    console.log('\nProcessing Local SVGs...');
    if (fs.existsSync(LOCAL_SVG_DIR)) {
        const files = fs.readdirSync(LOCAL_SVG_DIR).filter(f => f.endsWith('.svg'));
        for (const file of files) {
            const humanName = cleanName(file);
            console.log(` - ${humanName}`);
            
            // Generate a clean filename for the copy
            const safeFileName = file.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/_svg$/, '.svg');
            const destPath = path.join(ASSETS_DIR, safeFileName);
            
            // Copy file
            fs.copyFileSync(path.join(LOCAL_SVG_DIR, file), destPath);
            
            catalog.push({
                id: file.replace('.svg', ''),
                name: humanName,
                description: 'Local SVG icon (No pattern file yet)',
                type: 'local_svg',
                pat_file: null,
                pat_url: null,
                img_url: `/hatches-cadauth/assets/${safeFileName}`,
                svg_file: safeFileName
            });
        }
    } else {
        console.log('No local SVG directory found.');
    }
    
    // 4. Wait for all downloads
    console.log('\nDownloading PAT files...');
    await Promise.all(downloadPromises);
    
    // 5. Save Catalog
    fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
    
    console.log('\n✅ Scrape and consolidation completed successfully!');
    console.log(`Total items in catalog: ${catalog.length}`);
}

main().catch(err => {
    console.error('Error during scrape:', err);
    process.exit(1);
});
