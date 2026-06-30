export const arch_single_basketweave = {
  id: 'single_basketweave',
  name: 'Single Basketweave',
  categories: ["Brick Bond","Paving","Parquetry","Geometric"],
  controlsType: 'lines',
  iconUrl: '/patterns/single_basketweave.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 400,
    height: 300,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Single Basketweave',
      description: 'Patrón de mampostería tipo Single Basketweave. Ideal en vistas de alzado para fachadas o muros portantes.'
    },
    en: {
      name: 'Single Basketweave',
      description: 'Masonry pattern type Single Basketweave. Ideal for elevation views of facades or load-bearing walls.'
    },
    pt: {
      name: 'Single Basketweave',
      description: 'Padrão de alvenaria tipo Single Basketweave. Ideal em vistas de elevação para fachadas ou paredes estruturais.'
    }
  }
};
