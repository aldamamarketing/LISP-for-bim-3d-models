export const arch_double_flemish = {
  id: 'double_flemish',
  name: 'Double Flemish',
  categories: ["Brick Bond","Paving"],
  controlsType: 'lines',
  iconUrl: '/patterns/double_flemish.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 1800,
    height: 600,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Double Flemish',
      description: 'Patrón de mampostería tipo Double Flemish. Ideal en vistas de alzado para fachadas o muros portantes.'
    },
    en: {
      name: 'Double Flemish',
      description: 'Masonry pattern type Double Flemish. Ideal for elevation views of facades or load-bearing walls.'
    },
    pt: {
      name: 'Double Flemish',
      description: 'Padrão de alvenaria tipo Double Flemish. Ideal em vistas de elevação para fachadas ou paredes estruturais.'
    }
  }
};
