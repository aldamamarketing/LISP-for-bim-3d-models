export const arch_herringbone = {
  id: 'herringbone',
  name: 'Herringbone',
  categories: ["Geometric","Paving","Brick Bond","Parquetry"],
  controlsType: 'lines',
  iconUrl: '/patterns/herringbone.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 410,
    height: 260,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Herringbone',
      description: 'Patrón de mampostería tipo Herringbone. Ideal en vistas de alzado para fachadas o muros portantes.'
    },
    en: {
      name: 'Herringbone',
      description: 'Masonry pattern type Herringbone. Ideal for elevation views of facades or load-bearing walls.'
    },
    pt: {
      name: 'Herringbone',
      description: 'Padrão de alvenaria tipo Herringbone. Ideal em vistas de elevação para fachadas ou paredes estruturais.'
    }
  }
};
