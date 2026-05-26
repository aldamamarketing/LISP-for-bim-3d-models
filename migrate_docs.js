const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'web_old', 'docs');
const destDir = path.join(__dirname, 'web', 'src', 'pages', 'pt', 'docs');

const filesMap = {
  'lc-clean.html': 'lc-clean.astro',
  'lc-flatz.html': 'lc-flatz.astro',
  'lc-build.html': 'lc-build.astro',
  'lc-joints.html': 'lc-joints.astro',
  '../download.html': 'install.astro'
};

for (const [oldFile, newFile] of Object.entries(filesMap)) {
  const oldPath = path.join(srcDir, oldFile);
  const newPath = path.join(destDir, newFile);
  
  if (fs.existsSync(oldPath)) {
    const html = fs.readFileSync(oldPath, 'utf8');
    
    // Extract main content
    let content = '';
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
    if (mainMatch) {
      content = mainMatch[1];
      // remove breadcrumbs if any
      content = content.replace(/<div class="breadcrumbs">[\s\S]*?<\/div>/g, '');
    } else {
      // fallback to extracting body or just full text
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
      if (bodyMatch) content = bodyMatch[1];
      else content = html;
    }

    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1].split(' - ')[0] : 'Docs';

    const astroContent = `---
import DocsLayout from '../../../layouts/DocsLayout.astro';
---

<DocsLayout title="${title}">
  <div class="doc-content">
    ${content.trim()}
  </div>
</DocsLayout>
`;

    fs.writeFileSync(newPath, astroContent, 'utf8');
    console.log('Migrated', oldFile, 'to', newFile);
  } else {
    console.log('Not found:', oldPath);
  }
}
