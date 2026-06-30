export const arch_double_herringbone = {
  id: 'double_herringbone',
  name: 'Double Herringbone',
  categories: ["Geometric","Parquetry","Paving","Brick Bond"],
  controlsType: 'lines',
  iconUrl: '/patterns/double_herringbone.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 566,
    height: 283,
    joint: 0,
    rows: 2,
    columns: 2
  },
  hasBackendEngine: true,
  i18n: {
    es: {
      name: 'Double Herringbone',
      description: 'Patrón de mampostería tipo Double Herringbone. Ideal en vistas de alzado para fachadas o muros portantes.'
    },
    en: {
      name: 'Double Herringbone',
      description: 'Masonry pattern type Double Herringbone. Ideal for elevation views of facades or load-bearing walls.'
    },
    pt: {
      name: 'Double Herringbone',
      description: 'Padrão de alvenaria tipo Double Herringbone. Ideal em vistas de elevação para fachadas ou paredes estruturais.'
    }
  }
};
