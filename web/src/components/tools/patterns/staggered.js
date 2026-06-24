export const arch_staggered = {
  id: 'staggered',
  name: 'Staggered',
  categories: ["Brick Bond","Geometric","Paving","Roofing"],
  controlsType: 'lines',
  iconUrl: '/patterns/staggered.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 700,
    height: 500,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Staggered',
      description: 'Patrón de mampostería tipo Staggered. Ideal en vistas de alzado para fachadas o muros portantes.'
    },
    en: {
      name: 'Staggered',
      description: 'Masonry pattern type Staggered. Ideal for elevation views of facades or load-bearing walls.'
    },
    pt: {
      name: 'Staggered',
      description: 'Padrão de alvenaria tipo Staggered. Ideal em vistas de elevação para fachadas ou paredes estruturais.'
    }
  }
};
