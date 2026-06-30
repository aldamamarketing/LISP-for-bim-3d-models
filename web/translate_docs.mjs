import fs from 'fs';
import path from 'path';
import { translate } from '@vitalets/google-translate-api';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function translateMarkdown(filePath, targetLang) {
    console.log(`Translating ${filePath} to ${targetLang}...`);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const parts = content.split('---');
    if (parts.length < 3) return;

    let frontmatter = parts[1];
    let body = parts.slice(2).join('---');

    // Translate frontmatter fields
    let newFrontmatter = [];
    const lines = frontmatter.split('\n');
    for (const line of lines) {
        if (line.startsWith('title:')) {
            const val = line.split('title:')[1].trim().replace(/^['"](.*)['"]$/, '$1');
            const translated = await translate(val, { to: targetLang });
            newFrontmatter.push(`title: '${translated.text.replace(/'/g, "\\'")}'`);
        } else if (line.startsWith('description:')) {
            const val = line.split('description:')[1].trim().replace(/^['"](.*)['"]$/, '$1');
            const translated = await translate(val, { to: targetLang });
            newFrontmatter.push(`description: '${translated.text.replace(/'/g, "\\'")}'`);
        } else {
            newFrontmatter.push(line);
        }
    }

    // Split body into chunks (by double newline to preserve paragraphs)
    const paragraphs = body.split('\n\n');
    const translatedParagraphs = [];

    for (const p of paragraphs) {
        if (!p.trim() || p.startsWith('```') || p.startsWith('<') || p.startsWith('---') || p.startsWith('>')) {
            translatedParagraphs.push(p);
            continue;
        }

        try {
            const translated = await translate(p, { to: targetLang });
            translatedParagraphs.push(translated.text);
            await new Promise(r => setTimeout(r, 500)); // small delay
        } catch (e) {
            console.error(`Error translating chunk:`, e.message);
            translatedParagraphs.push(p);
        }
    }

    const newContent = `---${newFrontmatter.join('\n')}---${translatedParagraphs.join('\n\n')}`;
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`Saved ${filePath}`);
}

const baseDir = path.join(__dirname, 'src', 'content');

const targets = [
    { dir: path.join(baseDir, 'blog', 'en'), lang: 'en' },
    { dir: path.join(baseDir, 'blog', 'es'), lang: 'es' },
    { dir: path.join(baseDir, 'docs', 'en'), lang: 'en' },
    { dir: path.join(baseDir, 'docs', 'es'), lang: 'es' }
];

async function run() {
    for (const { dir, lang } of targets) {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
        for (const file of files) {
            if (file === 'auto-numbering-autolisp.md') continue; // already done
            await translateMarkdown(path.join(dir, file), lang);
        }
    }
}

run().catch(console.error);
