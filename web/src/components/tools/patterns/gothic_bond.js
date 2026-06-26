export const arch_gothic_bond = {
  id: 'gothic_bond',
  name: 'Gothic Bond',
  categories: ["Brick Bond"],
  controlsType: 'lines',
  iconUrl: '/patterns/gothic_bond.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 3000,
    height: 1000,
    joint: 0,
    rows: 2,
    columns: 2
  },
  hasBackendEngine: true,
  i18n: {
    es: {
      name: 'Gothic Bond',
      description: 'Patrón de mampostería tipo Gothic Bond. Ideal en vistas de alzado para fachadas o muros portantes.'
    },
    en: {
      name: 'Gothic Bond',
      description: 'Masonry pattern type Gothic Bond. Ideal for elevation views of facades or load-bearing walls.'
    },
    pt: {
      name: 'Gothic Bond',
      description: 'Padrão de alvenaria tipo Gothic Bond. Ideal em vistas de elevação para fachadas ou paredes estruturais.'
    }
  }
};
