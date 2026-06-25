import { generateSvgPathsFromPat } from '../../../utils/PatToSvgRenderer.js';

export const arch_stretcher = {
  id: 'stretcher',
  name: 'Stretcher',
  categories: ["Brick Bond","Paving","Geometric","Roofing"],
  controlsType: 'rectangular',
  iconUrl: '/patterns/stretcher.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 200,
    height: 200,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Stretcher',
      description: 'Mampostería tipo soga. Es el aparejo de ladrillo más común para muros.'
    },
    en: {
      name: 'Stretcher',
      description: 'Stretcher bond masonry. It is the most common brick bond for walls.'
    },
    pt: {
      name: 'Stretcher',
      description: 'Alvenaria tipo soga (stretcher). É o padrão de tijolos mais comum para paredes.'
    }
  },
  hasBackendEngine: true,
  generateSvgRenderer: (params) => {
    const w = params.width || 200;
    const h = params.height || 100;
    const j = params.joint || 0;
    
    const tw = w + j;
    const th = h + j;
    const halfTw = tw / 2;
    
    const patCode = `*Stretcher_${w}x${h}_J${j}, Parametric
0, 0,0, 0,${th}
90, 0,0, ${th},${halfTw}, ${h},-${th}`;

    // A single tile of stretcher needs to cover 1 full block width and 2 rows height to repeat properly
    const paths = generateSvgPathsFromPat(patCode, tw, th * 2);
    
    return {
      w: tw,
      h: th * 2,
      paths: paths,
      baseUnit: Math.max(tw, th)
    };
  }
};
