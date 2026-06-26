export const arch_triple_herringbone = {
  id: 'triple_herringbone',
  name: 'Triple Herringbone',
  categories: ["Paving","Brick Bond","Parquetry","Geometric"],
  controlsType: 'lines',
  iconUrl: '/patterns/triple_herringbone.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 566,
    height: 382,
    joint: 0,
    rows: 2,
    columns: 2
  },
  hasBackendEngine: true,
  i18n: {
    es: {
      name: 'Triple Herringbone',
      description: 'Patrón de mampostería tipo Triple Herringbone. Ideal en vistas de alzado para fachadas o muros portantes.'
    },
    en: {
      name: 'Triple Herringbone',
      description: 'Masonry pattern type Triple Herringbone. Ideal for elevation views of facades or load-bearing walls.'
    },
    pt: {
      name: 'Triple Herringbone',
      description: 'Padrão de alvenaria tipo Triple Herringbone. Ideal em vistas de elevação para fachadas ou paredes estruturais.'
    }
  }
};
