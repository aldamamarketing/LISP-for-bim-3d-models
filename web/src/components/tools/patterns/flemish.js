export const arch_flemish = {
  id: 'flemish',
  name: 'Flemish',
  categories: ["Geometric","Paving","Brick Bond"],
  controlsType: 'lines',
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
      description: 'Patrón de mampostería tipo Flemish. Ideal en vistas de alzado para fachadas o muros portantes.'
    },
    en: {
      name: 'Flemish',
      description: 'Masonry pattern type Flemish. Ideal for elevation views of facades or load-bearing walls.'
    },
    pt: {
      name: 'Flemish',
      description: 'Padrão de alvenaria tipo Flemish. Ideal em vistas de elevação para fachadas ou paredes estruturais.'
    }
  }
};
