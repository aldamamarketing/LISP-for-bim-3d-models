export const arch_stretcher = {
  id: 'stretcher',
  name: 'Stretcher',
  categories: ["Brick Bond","Paving","Geometric","Roofing"],
  controlsType: 'lines',
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
      description: 'Patrón de mampostería tipo Stretcher. Ideal en vistas de alzado para fachadas o muros portantes.'
    },
    en: {
      name: 'Stretcher',
      description: 'Masonry pattern type Stretcher. Ideal for elevation views of facades or load-bearing walls.'
    },
    pt: {
      name: 'Stretcher',
      description: 'Padrão de alvenaria tipo Stretcher. Ideal em vistas de elevação para fachadas ou paredes estruturais.'
    }
  }
};
