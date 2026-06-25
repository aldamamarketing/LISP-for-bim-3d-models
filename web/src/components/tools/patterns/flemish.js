import { generateSvgPathsFromPat } from '../../../utils/PatToSvgRenderer.js';

export const arch_flemish = {
  id: 'flemish',
  name: 'Flemish',
  categories: ["Geometric","Paving","Brick Bond"],
  controlsType: 'rectangular',
  iconUrl: '/patterns/flemish.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 450,
    height: 200,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Flemish',
      description: 'Aparejo Flamenco. Alterna soga y tizón en la misma hilada.'
    },
    en: {
      name: 'Flemish',
      description: 'Flemish bond. Alternates stretcher and header in the same course.'
    },
    pt: {
      name: 'Flemish',
      description: 'Aparelho Flamengo. Alterna tijolos compridos e curtos na mesma fiada.'
    }
  },
  hasBackendEngine: true,
  generateSvgRenderer: (params) => {
    const w = params.width || 200;
    const h = params.height || 100;
    const j = params.joint || 0;
    
    const tw = w + j;
    const th = h + j;
    const hw = w / 2 + j;
    const stepX = tw + hw;
    
    const patCode = `*Flemish_${w}x${h}_J${j}, Parametric
0, 0,0, 0,${th}
90, 0,0, 0,${th * 2}, ${h},-${th * 2 - h}
90, ${tw},0, 0,${th * 2}, ${h},-${th * 2 - h}
90, ${stepX / 2},${th}, 0,${th * 2}, ${h},-${th * 2 - h}
90, ${stepX / 2 + tw},${th}, 0,${th * 2}, ${h},-${th * 2 - h}`;

    // Tile bounding box
    const tileW = stepX;
    const tileH = th * 2;
    const paths = generateSvgPathsFromPat(patCode, tileW, tileH);
    
    return {
      w: tileW,
      h: tileH,
      paths: paths,
      baseUnit: Math.max(w, h)
    };
  }
};
