/**
 * Visual Inspection Metadata Map
 * Generado tras inspeccionar visualmente los SVGs en el visor 4x4.
 */

function getVisualMetadata(filename) {
    const id = filename.replace('.svg', '').toLowerCase();
    
    // Metadatos por defecto
    let name = id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    let description = `${name} pattern.`;
    let categories = ['Architecture'];

    // --- REGLAS BASADAS EN INSPECCION VISUAL DE LA IMAGEN ---

    // 1. Patrones de Ladrillo y Mampostería (Bonds, Ashlar, Brick, Stone, Rubble)
    if (id.includes('bond') || id.includes('stretcher') || id.includes('ashlar') || id.includes('brick') || id.includes('rubble') || id.includes('stone') || id.includes('cobble')) {
        categories.push('Masonry');
        
        if (id.includes('1_3') || id.includes('1_4')) {
            categories.push('Brickwork');
            description = `Offset masonry bond pattern (${id.includes('1_3') ? '1/3' : '1/4'} shift) using rectangular units, ideal for brick walls and paving.`;
        } else if (id.includes('ashlar')) {
            categories.push('Stone', 'Paving');
            description = `Ashlar masonry pattern with interlocking rectangular and square stones of varying sizes. Perfect for patios and stone walls.`;
        } else if (id.includes('rubble')) {
            categories.push('Stone', 'Landscaping');
            description = `Irregular rubble stone masonry pattern with organic shapes, great for rustic walls and landscaping.`;
        } else if (id.includes('cobble')) {
            categories.push('Stone', 'Landscaping', 'Paving');
            description = `Cobblestone paving pattern with rounded and irregular stones.`;
        } else if (id.includes('flemish') || id.includes('english')) {
            categories.push('Brickwork');
            description = `Classic ${id.includes('flemish') ? 'Flemish' : 'English'} bond brickwork pattern with alternating headers and stretchers.`;
        }
    }

    // 2. Patrones de Madera y Pisos (Chevron, Herringbone, Parquet, Wood)
    if (id.includes('chevron') || id.includes('herringbone') || id.includes('parquet') || id.includes('wood') || id.includes('basketweave')) {
        categories.push('Flooring', 'Woodwork');
        
        if (id.includes('chevron')) {
            description = `V-shaped chevron zig-zag pattern, perfect for wood flooring, tile layouts, and modern architectural finishes.`;
        } else if (id.includes('herringbone')) {
            description = `Classic herringbone pattern with interlocking rectangular tiles or wood planks at a 45-degree angle.`;
            if (id.includes('double') || id.includes('triple')) {
                description = `Multi-plank ${id.includes('double') ? 'double' : 'triple'} herringbone pattern for flooring.`;
            }
        } else if (id.includes('basketweave')) {
            description = `Woven basketweave pattern with interwoven blocks, commonly used in parquet flooring and tile mosaics.`;
        } else if (id.includes('parquet')) {
            description = `Geometric parquet flooring pattern.`;
        }
    }

    // 3. Patrones de Tejas y Cubiertas (Fishscale, Roof, Spanish)
    if (id.includes('fishscale') || id.includes('roof') || id.includes('spanish')) {
        categories.push('Roofing', 'Exterior');
        
        if (id.includes('fishscale')) {
            categories.push('Decorative');
            description = `Overlapping fishscale or scallop pattern, typically used for decorative roofing shingles and siding.`;
        } else if (id.includes('spanish')) {
            categories.push('Tile');
            description = `Curved Spanish barrel roof tile pattern.`;
        }
    }

    // 4. Patrones Geométricos y Mosaicos (Hexagon, Diamond, Octagon, Star, Mosaic, Intersecting, Geometric)
    if (id.includes('hex') || id.includes('diamond') || id.includes('octagon') || id.includes('star') || id.includes('mosaic') || id.includes('intersect') || id.includes('geometric') || id.includes('cross') || id.includes('circle')) {
        categories.push('Tile', 'Decorative', 'Geometric');
        
        if (id.includes('hex')) {
            description = `Hexagonal geometric pattern. Excellent for floor tiles and bathroom mosaics.`;
        } else if (id.includes('diamond')) {
            description = `Diamond-shaped geometric grid pattern.`;
        } else if (id.includes('octagon')) {
            description = `Octagonal tile pattern, often paired with smaller square inserts (dot).`;
        } else if (id.includes('star') && id.includes('cross')) {
            description = `Moorish-inspired interlocking star and cross tile pattern.`;
        } else if (id.includes('intersect') || id.includes('circle')) {
            description = `Curvilinear geometric pattern featuring intersecting circles or arcs.`;
        }
    }

    // 5. Patrones Específicos Adicionales
    if (id.includes('houndstooth')) {
        categories.push('Textile', 'Decorative');
        description = `Classic houndstooth duotone textile pattern.`;
    }
    if (id.includes('versailles')) {
        categories.push('Tile', 'Paving', 'Stone');
        description = `Versailles tile pattern, an elegant multi-sized modular layout often used for travertine and stone paving.`;
    }

    // Evitar duplicados
    categories = [...new Set(categories)];

    return {
        name,
        description,
        categories
    };
}

module.exports = { getVisualMetadata };
