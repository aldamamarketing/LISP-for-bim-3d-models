export const arch_basketweave = {
  id: 'basketweave',
  name: 'Basketweave',
  categories: ["Brick Bond","Paving","Parquetry","Geometric"],
  controlsType: 'lines',
  iconUrl: '/patterns/basketweave.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 800,
    height: 800,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Basketweave',
      description: 'Patrón de mampostería tipo Basketweave. Ideal en vistas de alzado para fachadas o muros portantes.'
    },
    en: {
      name: 'Basketweave',
      description: 'Masonry pattern type Basketweave. Ideal for elevation views of facades or load-bearing walls.'
    },
    pt: {
      name: 'Basketweave',
      description: 'Padrão de alvenaria tipo Basketweave. Ideal em vistas de elevação para fachadas ou paredes estruturais.'
    }
  }
};
